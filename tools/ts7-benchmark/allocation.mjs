import { Session } from 'node:inspector';
import { PerformanceObserver } from 'node:perf_hooks';

// Diagnostic only: V8's weighted allocation samples include objects that die
// during analysis. A retained-heap profile would miss short-lived bridge churn.
export async function startAllocationProfile(intervalBytes = 32768) {
  const session = new Session();
  session.connect();
  const post = (method, params = {}) =>
    new Promise((resolve, reject) =>
      session.post(method, params, (error, result) => (error ? reject(error) : resolve(result))),
    );
  const entries = [];
  const observer = new PerformanceObserver(list => entries.push(...list.getEntries()));
  observer.observe({ entryTypes: ['gc'] });
  try {
    await post('HeapProfiler.startSampling', {
      samplingInterval: intervalBytes,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
  } catch (error) {
    observer.disconnect();
    session.disconnect();
    throw error;
  }
  const startMs = performance.now();
  return async () => {
    const endMs = performance.now();
    try {
      const { profile } = await post('HeapProfiler.stopSampling');
      // GC entries from synchronous analysis are delivered on the next turn.
      // Stop sampling first and clip events, excluding report processing.
      await new Promise(resolve => setImmediate(resolve));
      entries.push(...observer.takeRecords());
      const gc = entries
        .filter(entry => entry.startTime < endMs && entry.startTime + entry.duration > startMs)
        .map(entry => ({
          startMs: entry.startTime,
          durationMs:
            Math.min(endMs, entry.startTime + entry.duration) - Math.max(startMs, entry.startTime),
          kind: entry.detail.kind,
          flags: entry.detail.flags,
        }));
      return { profile, intervalBytes, window: { startMs, endMs }, gc };
    } finally {
      observer.disconnect();
      session.disconnect();
    }
  };
}

export function summarizeAllocations({ profile, intervalBytes, window, gc }, policy) {
  const sites = [];
  const owners = {};
  let estimatedBytes = 0;
  function visit(node, callers) {
    const stack = [...callers, node.callFrame];
    if (node.selfSize > 0) {
      const locations = stack
        .toReversed()
        .map(frame => policy.classify(frame))
        .filter(Boolean);
      let location = locations[0];
      if (location?.owner === 'host') {
        const caller = locations.find(
          item => item.owner !== 'host' && item.component !== 'measurement',
        );
        location = { ...location, owner: caller?.owner === 'compiler' ? 'host' : 'consumer' };
      }
      location ??= { owner: 'unattributed', component: 'no-source-stack' };
      estimatedBytes += node.selfSize;
      const key = `${location.owner}/${location.component}`;
      owners[key] = (owners[key] ?? 0) + node.selfSize;
      sites.push({ ...location, estimatedBytes: node.selfSize, stack });
    }
    for (const child of node.children ?? []) visit(child, stack);
  }
  visit(profile.head, []);
  return {
    method: 'V8 sampled allocation estimates, including objects collected by minor/major GC',
    intervalBytes,
    window,
    estimatedBytes,
    samples: profile.samples.length,
    owners,
    topSites: sites.sort((a, b) => b.estimatedBytes - a.estimatedBytes).slice(0, 100),
    gc: {
      events: gc,
      count: gc.length,
      durationMs: gc.reduce((sum, entry) => sum + entry.durationMs, 0),
    },
    limitations: [
      'Diagnostic runs incur allocation-profiler overhead; use separate unprofiled controls for runtime comparisons.',
      'Weighted V8 samples estimate JS allocations, not exact allocated bytes, peak heap, Go allocations or WASM linear memory.',
      'Allocation stacks identify allocation sites; GC event durations do not prove which allocator caused a pause.',
      'The sampling window brackets analysis with profiler start/stop overhead outside the analysis timer.',
    ],
  };
}
