import { Session } from 'node:inspector';

function accumulator() {
  return { requestCount: 0, roundTripMs: 0, bytesSent: 0, bytesReceived: 0, maxRoundTripMs: 0 };
}

export function createPerformanceProfiler() {
  let phase = 'selection';
  let current;
  const methods = new Map();
  const phases = new Map();
  const rules = new Map();
  const ruleMethods = new Map();
  const totals = accumulator();
  const batches = { calls: 0, logicalRequests: 0, maxSize: 0, methods: {}, phases: {}, rules: {} };
  const add = (target, sample) => {
    target.requestCount++;
    target.roundTripMs += sample.roundTripMs;
    target.bytesSent += sample.bytesSent;
    target.bytesReceived += sample.bytesReceived;
    target.maxRoundTripMs = Math.max(target.maxRoundTripMs, sample.roundTripMs);
  };
  const entry = (map, key) => {
    if (!map.has(key)) map.set(key, accumulator());
    return map.get(key);
  };
  const ruleEntry = key => {
    if (!rules.has(key))
      rules.set(key, {
        ...accumulator(),
        createCalls: 0,
        listenerCalls: 0,
        createMs: 0,
        listenerMs: 0,
        exclusiveMs: 0,
      });
    return rules.get(key);
  };
  function invoke(key, kind, callback, receiver, args) {
    const parent = current;
    const frame = { key, childMs: 0 };
    current = frame;
    const start = performance.now();
    try {
      return Reflect.apply(callback, receiver, args);
    } finally {
      const elapsed = performance.now() - start;
      const stats = ruleEntry(key);
      stats[`${kind}Calls`]++;
      stats[`${kind}Ms`] += elapsed;
      stats.exclusiveMs += elapsed - frame.childMs;
      if (parent) parent.childMs += elapsed;
      current = parent;
    }
  }
  return {
    setPhase(value) {
      phase = value;
    },
    record(sample) {
      add(totals, sample);
      add(entry(methods, sample.method), sample);
      add(entry(phases, phase), sample);
      if (current) {
        add(ruleEntry(current.key), sample);
        if (!ruleMethods.has(current.key)) ruleMethods.set(current.key, new Map());
        add(entry(ruleMethods.get(current.key), sample.method), sample);
      }
    },
    attachTimingCollector(TimingCollector) {
      const original = TimingCollector.prototype.record;
      const record = this.record;
      function wrapped(sample) {
        const result = Reflect.apply(original, this, [sample]);
        record(sample);
        return result;
      }
      TimingCollector.prototype.record = wrapped;
      return () => {
        TimingCollector.prototype.record = original;
      };
    },
    attachClient(Client) {
      const original = Client.prototype.batchRequests;
      Client.prototype.batchRequests = function (requests) {
        batches.calls++;
        batches.logicalRequests += requests.length;
        batches.maxSize = Math.max(batches.maxSize, requests.length);
        batches.phases[phase] = (batches.phases[phase] ?? 0) + requests.length;
        if (current)
          batches.rules[current.key] = (batches.rules[current.key] ?? 0) + requests.length;
        for (const { method } of requests)
          batches.methods[method] = (batches.methods[method] ?? 0) + 1;
        return Reflect.apply(original, this, [requests]);
      };
      return () => {
        Client.prototype.batchRequests = original;
      };
    },
    wrapRule(key, rule) {
      return {
        ...rule,
        create(...args) {
          const listeners = invoke(key, 'create', rule.create, rule, args);
          return Object.fromEntries(
            Object.entries(listeners).map(([selector, callback]) => [
              selector,
              function (...listenerArgs) {
                return invoke(key, 'listener', callback, this, listenerArgs);
              },
            ]),
          );
        },
      };
    },
    getReport() {
      return {
        totals: { ...totals },
        batches,
        methods: Object.fromEntries(methods),
        phases: Object.fromEntries(phases),
        rules: Object.fromEntries(rules),
        ruleMethods: Object.fromEntries(
          [...ruleMethods].map(([key, map]) => [key, Object.fromEntries(map)]),
        ),
      };
    },
  };
}

export async function startCpuProfile() {
  const session = new Session();
  session.connect();
  const post = (method, params = {}) =>
    new Promise((resolve, reject) =>
      session.post(method, params, (error, result) => (error ? reject(error) : resolve(result))),
    );
  try {
    await post('Profiler.enable');
    await post('Profiler.setSamplingInterval', { interval: 1000 });
    await post('Profiler.start');
  } catch (error) {
    session.disconnect();
    throw error;
  }
  return async () => {
    try {
      return (await post('Profiler.stop')).profile;
    } finally {
      session.disconnect();
    }
  };
}

// Sample time includes synchronous native-pipe waits; it is not Node CPU usage.
export function summarizeCpuProfile(profile) {
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const parent = new Map();
  for (const node of profile.nodes)
    for (const child of node.children ?? []) parent.set(child, node.id);
  const stats = new Map();
  const get = id => {
    if (!stats.has(id)) stats.set(id, { ...nodes.get(id).callFrame, selfMs: 0, inclusiveMs: 0 });
    return stats.get(id);
  };
  for (let index = 0; index < (profile.samples?.length ?? 0); index++) {
    const id = profile.samples[index];
    const ms = profile.timeDeltas[index] / 1000;
    get(id).selfMs += ms;
    for (let frame = id; frame !== undefined; frame = parent.get(frame))
      get(frame).inclusiveMs += ms;
  }
  const functions = new Map();
  for (const frame of stats.values()) {
    const key = JSON.stringify([
      frame.functionName,
      frame.url,
      frame.lineNumber,
      frame.columnNumber,
    ]);
    if (!functions.has(key)) functions.set(key, { ...frame, selfMs: 0 });
    functions.get(key).selfMs += frame.selfMs;
  }
  return {
    durationMs: (profile.endTime - profile.startTime) / 1000,
    samples: profile.samples?.length ?? 0,
    topSelf: [...functions.values()]
      .map(({ inclusiveMs, ...frame }) => frame)
      .sort((a, b) => b.selfMs - a.selfMs)
      .slice(0, 40),
    topInclusive: [...stats.values()].sort((a, b) => b.inclusiveMs - a.inclusiveMs).slice(0, 40),
  };
}
