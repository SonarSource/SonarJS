import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPerformanceProfiler, startCpuProfile, summarizeCpuProfile } from './profiling.mjs';

const sample = { method: 'getType', roundTripMs: 2, bytesSent: 10, bytesReceived: 20 };

test('profiling attributes existing SDK samples without changing the collector', () => {
  class Collector {
    samples = [];
    record(value) {
      this.samples.push(value);
      return 42;
    }
  }
  const original = Collector.prototype.record;
  const profiler = createPerformanceProfiler();
  const detach = profiler.attachTimingCollector(Collector);
  const collector = new Collector();
  profiler.setPhase('parse');
  assert.equal(collector.record(sample), 42);
  profiler.setPhase('lint');
  const rule = {
    marker: 3,
    create() {
      assert.equal(this.marker, 3);
      collector.record(sample);
      return {
        Identifier(value) {
          assert.equal(this.marker, 4);
          collector.record(sample);
          return value;
        },
      };
    },
  };
  const listeners = profiler.wrapRule('S1', rule).create({});
  assert.equal(listeners.Identifier.call({ marker: 4 }, 'node'), 'node');
  const report = profiler.getReport();
  assert.equal(report.totals.requestCount, 3);
  assert.equal(report.methods.getType.roundTripMs, 6);
  assert.equal(report.phases.parse.requestCount, 1);
  assert.equal(report.phases.lint.requestCount, 2);
  assert.equal(report.rules.S1.requestCount, 2);
  assert.equal(report.rules.S1.createCalls, 1);
  assert.equal(report.rules.S1.listenerCalls, 1);
  assert.equal(report.ruleMethods.S1.getType.bytesReceived, 40);
  assert.deepEqual(collector.samples, [sample, sample, sample]);
  detach();
  assert.equal(Collector.prototype.record, original);
});

test('nested callbacks and throws restore attribution and preserve errors', () => {
  const profiler = createPerformanceProfiler();
  const error = new Error('expected');
  const inner = profiler
    .wrapRule('inner', {
      create: () => ({
        Node() {
          profiler.record(sample);
          throw error;
        },
      }),
    })
    .create();
  const outer = profiler
    .wrapRule('outer', {
      create: () => ({
        Node() {
          assert.throws(
            () => inner.Node(),
            value => value === error,
          );
          profiler.record(sample);
        },
      }),
    })
    .create();
  outer.Node();
  profiler.record(sample);
  const report = profiler.getReport();
  assert.equal(report.rules.inner.requestCount, 1);
  assert.equal(report.rules.outer.requestCount, 1);
  assert.equal(report.totals.requestCount, 3);
  assert.ok(
    report.rules.outer.exclusiveMs <= report.rules.outer.createMs + report.rules.outer.listenerMs,
  );
  assert.throws(
    () =>
      profiler
        .wrapRule('bad', {
          create() {
            throw error;
          },
        })
        .create(),
    value => value === error,
  );
  profiler.record(sample);
  assert.equal(profiler.getReport().rules.bad.requestCount, 0);
});

test('CPU summaries account for stack inclusives and microsecond samples', () => {
  const profile = {
    nodes: [
      { id: 1, callFrame: { functionName: 'root' }, children: [2] },
      { id: 2, callFrame: { functionName: 'leaf' } },
    ],
    samples: [2, 1],
    timeDeltas: [1000, 2000],
    startTime: 0,
    endTime: 3000,
  };
  const result = summarizeCpuProfile(profile);
  assert.equal(result.durationMs, 3);
  assert.equal(result.topSelf[0].functionName, 'root');
  assert.equal(result.topSelf[0].selfMs, 2);
  assert.equal(result.topInclusive[0].inclusiveMs, 3);
});

test('batch instrumentation counts logical queries without changing requests or results', () => {
  class Client {
    batchRequests(requests) {
      assert.equal(this.marker, 7);
      return requests;
    }
  }
  const original = Client.prototype.batchRequests;
  const profiler = createPerformanceProfiler();
  const detach = profiler.attachClient(Client);
  const client = new Client();
  client.marker = 7;
  const requests = [{ method: 'type' }, { method: 'symbol' }, { method: 'type' }];
  profiler.setPhase('lint');
  const listeners = profiler
    .wrapRule('S1', { create: () => ({ Node: () => client.batchRequests(requests) }) })
    .create();
  assert.equal(listeners.Node(), requests);
  assert.deepEqual(profiler.getReport().batches, {
    calls: 1,
    logicalRequests: 3,
    maxSize: 3,
    methods: { type: 2, symbol: 1 },
    phases: { lint: 3 },
    rules: { S1: 3 },
  });
  detach();
  assert.equal(Client.prototype.batchRequests, original);
});

test('CPU profiler produces a usable inspector profile', async () => {
  const stop = await startCpuProfile();
  const end = performance.now() + 15;
  while (performance.now() < end) Math.sqrt(performance.now());
  const profile = await stop();
  assert.ok(profile.nodes.length > 0);
  assert.ok(summarizeCpuProfile(profile).samples > 0);
});
