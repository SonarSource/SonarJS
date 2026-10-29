import path from 'node:path';
import { fileURLToPath } from 'node:url';

// V8's profile timestamps and hrtime use the same monotonic clock, in microseconds.
// Do not align them with Date.now(), timeOrigin, or the time Profiler.start returns.
export const monotonicMicros = () => Number(process.hrtime.bigint()) / 1000;

const normalize = value => value.replaceAll('\\', '/').replace(/\/$/, '');
const within = (file, root) => file === root || file.startsWith(`${root}/`);

/** One ownership policy for every backend and every report consumer. */
export function createOwnershipPolicy({ repository, classicRoot, sdkRoot, wasmRoot }) {
  const root = normalize(repository);
  const compilerRoots = [
    [`${root}/packages/typescript`, 'facade-adapters'],
    [`${root}/packages/analysis/src/jsts/native`, 'native-integration'],
    [`${root}/lib/analysis/src/jsts/native`, 'native-integration'],
    [classicRoot && normalize(classicRoot), 'ts6-compiler'],
    [sdkRoot && normalize(sdkRoot), 'native-sdk'],
    [wasmRoot && normalize(wasmRoot), 'wasm-runtime'],
  ].filter(([directory]) => directory);
  const hostRoots = [
    `${root}/packages/analysis/src/jsts/native/filesystem.mjs`,
    `${root}/packages/analysis/src/jsts/program/compilerHost.`,
    `${root}/packages/analysis/src/jsts/program/cache/`,
    `${root}/packages/shared/src/fs-cache/`,
    `${root}/lib/analysis/src/jsts/native/filesystem.mjs`,
    `${root}/lib/analysis/src/jsts/program/compilerHost.`,
    `${root}/lib/analysis/src/jsts/program/cache/`,
    `${root}/lib/shared/src/fs-cache/`,
  ];
  const measurementFiles = [
    'ownership.mjs',
    'profiling.mjs',
    'allocation.mjs',
    'routing.mjs',
    'results.mjs',
  ].map(file => `${root}/tools/ts7-benchmark/${file}`);
  const classifySource = frame => {
    const url = frame.url ?? '';
    if (url.startsWith('wasm://') || /^wasm-function\[/.test(frame.functionName ?? ''))
      return { owner: 'compiler', component: 'wasm-execution', source: url || 'wasm' };
    if (!url || url.startsWith('node:') || url.startsWith('internal/')) return undefined;
    let file;
    try {
      file = normalize(url.startsWith('file:') ? fileURLToPath(new URL(url)) : url);
    } catch {
      return { owner: 'unattributed', component: 'unknown-source', source: url };
    }
    if (measurementFiles.includes(file))
      return { owner: 'unattributed', component: 'measurement', source: file };
    if (hostRoots.some(directory => file.startsWith(directory)))
      return { owner: 'host', component: 'host-services', source: file };
    for (const [directory, component] of compilerRoots)
      if (within(file, directory)) return { owner: 'compiler', component, source: file };
    if (within(file, root)) return { owner: 'consumer', component: 'consumer', source: file };
    return { owner: 'unattributed', component: 'unknown-source', source: file };
  };
  return {
    definition: {
      method: 'exclusive sampled wall time by innermost source ownership',
      compilerRoots,
      hostRoots,
      measurementFiles,
      hostPolicy:
        'Compiler-initiated host services are a nested TS-layer subcost; reentry returns to compiler ownership.',
      builtins:
        'Inherit the nearest classified caller. GC, idle, unknown sources and sampling gaps remain unattributed.',
      limitations: [
        'Sampling estimates elapsed stack residency, including synchronous waits; it is not CPU usage or causal allocation/GC attribution.',
        'This observes lazy getters, iterators and callbacks without changing compiler object shapes. Unsampled short calls have no exact call count.',
        'Attribution depends on the declared source roots. Unknown sources are reported rather than assigned to consumers.',
      ],
    },
    classify(frame) {
      const location = classifySource(frame);
      return (
        location && {
          ...location,
          functionName: frame.functionName,
          lineNumber: frame.lineNumber,
          columnNumber: frame.columnNumber,
        }
      );
    },
  };
}

export function createAnalysisTimeline(now = monotonicMicros) {
  let startUs;
  let endUs;
  const phases = [];
  return {
    start() {
      if (startUs !== undefined) throw new Error('Analysis timeline already started');
      startUs = now();
      phases.push({ name: 'setup', startUs });
      return startUs;
    },
    phase(name) {
      if (startUs === undefined || endUs !== undefined)
        throw new Error('Inactive analysis timeline');
      const time = now();
      phases.at(-1).endUs = time;
      phases.push({ name, startUs: time });
    },
    stop() {
      if (startUs === undefined || endUs !== undefined)
        throw new Error('Inactive analysis timeline');
      endUs = now();
      phases.at(-1).endUs = endUs;
      return { startUs, endUs, phases: phases.map(phase => ({ ...phase })) };
    },
  };
}

const buckets = () => ({ consumerMs: 0, compilerMs: 0, hostMs: 0, unattributedMs: 0 });
const reconcile = (value, totalMs) => ({
  ...value,
  totalMs,
  typeScriptMs: value.compilerMs + value.hostMs,
  reconciliationErrorMs:
    totalMs - value.consumerMs - value.compilerMs - value.hostMs - value.unattributedMs,
});

/** Attribute each elapsed interval exactly once; never sum inclusive stack times. */
export function summarizeOwnership(profile, timeline, policy, intervalMicros = 1000) {
  if (profile.samples?.length !== profile.timeDeltas?.length)
    throw new Error('Incomplete V8 sample/timestamp arrays');
  if (
    !Number.isFinite(timeline.startUs) ||
    timeline.endUs < timeline.startUs ||
    timeline.startUs < profile.startTime ||
    timeline.endUs > profile.endTime
  )
    throw new Error('Analysis interval is outside the V8 monotonic profile clock');
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes) for (const id of node.children ?? []) parents.set(id, node.id);
  const ownership = new Map();
  function classify(id) {
    if (ownership.has(id)) return ownership.get(id);
    const special = nodes.get(id)?.callFrame.functionName;
    let result;
    if (['(garbage collector)', '(idle)', '(program)'].includes(special))
      result = { owner: 'unattributed', component: special, source: special };
    else {
      const stack = [];
      const visited = new Set();
      for (let current = id; current !== undefined; current = parents.get(current)) {
        if (visited.has(current)) throw new Error('Cyclic V8 stack');
        visited.add(current);
        const node = nodes.get(current);
        if (!node) throw new Error(`Missing V8 node ${current}`);
        const location = policy.classify(node.callFrame);
        if (location) stack.push(location);
      }
      result = stack[0];
      if (result?.owner === 'host') {
        const caller = stack.find(
          location => location.owner !== 'host' && location.component !== 'measurement',
        );
        // A compiler call made *by* a host callback takes the compiler branch
        // above. A parser callback called *by* traversal takes the consumer branch.
        result = { ...result, owner: caller?.owner === 'compiler' ? 'host' : 'consumer' };
      }
    }
    result ??= { owner: 'unattributed', component: 'no-source-stack', source: 'no-source-stack' };
    ownership.set(id, result);
    return result;
  }
  const totals = buckets();
  const phases = new Map();
  const sources = new Map();
  const functions = new Map();
  const components = {};
  const reasons = {};
  const intervals = [];
  let assignedMs = 0;
  let samples = 0;
  const longGapMicros = Math.max(10_000, 10 * intervalMicros);
  function account(start, end, location) {
    const startUs = Math.max(start, timeline.startUs);
    const endUs = Math.min(end, timeline.endUs);
    if (endUs <= startUs) return;
    const ms = (endUs - startUs) / 1000;
    const key = `${location.owner}Ms`;
    totals[key] += ms;
    assignedMs += ms;
    components[location.component] = (components[location.component] ?? 0) + ms;
    if (location.owner === 'unattributed')
      reasons[location.component] = (reasons[location.component] ?? 0) + ms;
    const sourceKey = `${location.owner}:${location.source}`;
    if (!sources.has(sourceKey))
      sources.set(sourceKey, {
        owner: location.owner,
        component: location.component,
        source: location.source,
        ms: 0,
        samples: 0,
      });
    sources.get(sourceKey).ms += ms;
    sources.get(sourceKey).samples++;
    const functionKey = JSON.stringify([
      sourceKey,
      location.functionName,
      location.lineNumber,
      location.columnNumber,
    ]);
    if (!functions.has(functionKey)) functions.set(functionKey, { ...location, ms: 0, samples: 0 });
    functions.get(functionKey).ms += ms;
    functions.get(functionKey).samples++;
    for (const phase of timeline.phases) {
      const overlap = Math.min(endUs, phase.endUs) - Math.max(startUs, phase.startUs);
      if (overlap <= 0) continue;
      if (!phases.has(phase.name)) phases.set(phase.name, buckets());
      phases.get(phase.name)[key] += overlap / 1000;
    }
  }
  let recordedTime = profile.startTime;
  let latestTime = profile.startTime;
  let negativeDeltaCount = 0;
  let maxBackwardMicros = 0;
  const events = profile.samples.map((id, index) => {
    const delta = profile.timeDeltas[index];
    if (!Number.isFinite(delta)) throw new Error('Invalid V8 sample delta');
    recordedTime += delta;
    if (delta < 0) {
      negativeDeltaCount++;
    }
    maxBackwardMicros = Math.max(maxBackwardMicros, latestTime - recordedTime);
    latestTime = Math.max(latestTime, recordedTime);
    return { id, time: recordedTime };
  });
  // V8 can emit slightly out-of-order samples (observed: -41 us). Recover the
  // timestamped events, then order them; never clamp negative deltas and inflate
  // elapsed time. Larger inversions remain errors rather than guessed coverage.
  if (maxBackwardMicros > intervalMicros)
    throw new Error('V8 sample timestamp inversion exceeds sampling interval');
  events.sort((a, b) => a.time - b.time);
  let time = profile.startTime;
  for (const event of events) {
    const next = event.time;
    if (next < profile.startTime) throw new Error('V8 sample precedes profile start');
    const delta = next - time;
    if (next > timeline.startUs && time < timeline.endUs) {
      samples++;
      intervals.push(delta / 1000);
      account(
        time,
        next,
        delta > longGapMicros
          ? { owner: 'unattributed', component: 'long-sampling-gap', source: 'long-sampling-gap' }
          : classify(event.id),
      );
    }
    time = next;
  }
  // No fabricated stack for the unsampled tail (or an empty profile).
  account(Math.max(time, profile.startTime), timeline.endUs, {
    owner: 'unattributed',
    component: 'unsampled',
    source: 'unsampled',
  });
  const totalMs = (timeline.endUs - timeline.startUs) / 1000;
  if (Math.abs(assignedMs - totalMs) > 0.01) throw new Error('V8 intervals do not cover analysis');
  const phaseDurations = {};
  for (const phase of timeline.phases)
    phaseDurations[phase.name] =
      (phaseDurations[phase.name] ?? 0) + (phase.endUs - phase.startUs) / 1000;
  intervals.sort((a, b) => a - b);
  return {
    schemaVersion: 1,
    method: 'v8-stack-sampling',
    completeExactTiming: false,
    policy: policy.definition,
    totals: reconcile(totals, totalMs),
    phases: Object.fromEntries(
      [...phases].map(([phase, value]) => [phase, reconcile(value, phaseDurations[phase])]),
    ),
    components,
    unattributedReasons: reasons,
    sources: [...sources.values()].sort((a, b) => b.ms - a.ms),
    functions: [...functions.values()].sort((a, b) => b.ms - a.ms),
    sampling: {
      samples,
      negativeDeltaCount,
      maxBackwardMicros,
      requestedIntervalMs: intervalMicros / 1000,
      medianIntervalMs: intervals[Math.floor(intervals.length / 2)] ?? null,
      p95IntervalMs: intervals[Math.floor(intervals.length * 0.95)] ?? null,
      maxIntervalMs: intervals.at(-1) ?? null,
      longGapThresholdMs: longGapMicros / 1000,
      // A resolution indicator, NOT a statistical confidence interval. Adjacent
      // samples can be correlated and source boundaries can fall between ticks.
      boundaryResolutionMs: Math.min(intervals.at(-1) ?? totalMs, longGapMicros / 1000),
    },
  };
}
