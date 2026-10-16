import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { startAllocationProfile, summarizeAllocations } from './allocation.mjs';
import { createOwnershipPolicy } from './ownership.mjs';

test('allocation attribution counts each site once, including consumer callbacks and host reentry', () => {
  const frame = url => ({ functionName: 'allocate', url, lineNumber: 0, columnNumber: 0 });
  const node = (url, selfSize, children = []) => ({ callFrame: frame(url), selfSize, children });
  const profile = {
    head: node('', 0, [
      node('/repo/packages/typescript/adapter.ts', 100, [
        node('/repo/node_modules/parser/visitor.js', 200),
        node('/repo/packages/analysis/src/jsts/native/filesystem.mjs', 300, [
          node('/classic/lib/typescript.js', 400),
        ]),
      ]),
      node('/unknown/allocate.js', 500),
    ]),
    samples: [],
  };
  const result = summarizeAllocations(
    { profile, intervalBytes: 1024, window: { startMs: 0, endMs: 10 }, gc: [{ durationMs: 2 }] },
    createOwnershipPolicy({ repository: '/repo', classicRoot: '/classic' }),
  );
  assert.equal(result.estimatedBytes, 1500);
  assert.deepEqual(result.owners, {
    'compiler/facade-adapters': 100,
    'consumer/consumer': 200,
    'host/host-services': 300,
    'compiler/ts6-compiler': 400,
    'unattributed/unknown-source': 500,
  });
  assert.equal(
    result.topSites.reduce((sum, site) => sum + site.estimatedBytes, 0),
    1500,
  );
  assert.equal(result.gc.durationMs, 2);
});

test('live allocation sampling retains transient allocation evidence and GC events', () => {
  const child = spawnSync(
    process.execPath,
    [
      '--expose-gc',
      '--input-type=module',
      '--eval',
      `
    import assert from 'node:assert/strict';
    import {startAllocationProfile} from ${JSON.stringify(new URL('./allocation.mjs', import.meta.url).href)};
    const stop = await startAllocationProfile(1024);
    function allocate() { return Array.from({length: 20000}, (_, index) => ({index, text: 'item-' + index})); }
    let items=allocate();
    assert.equal(items.length,20000);
    items=null;
    gc();
    const result=await stop();
    assert.ok(result.profile.samples.length>0);
    assert.ok(result.gc.length>0, 'GC events from synchronous work must be drained');
    const frames=[];
    function visit(n) { frames.push(n.callFrame.functionName); for(const c of n.children??[])visit(c); }
    visit(result.profile.head);
    assert.ok(frames.includes('allocate'), 'collected allocations remain in profile');
  `,
    ],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.equal(child.status, 0, child.stdout + child.stderr);
});

test('allocation profiling can stop without forcing a collection', async () => {
  const stop = await startAllocationProfile();
  const keep = Array.from({ length: 10000 }, (_, value) => ({ value }));
  const { profile, window } = await stop();
  assert.ok(profile.samples.length > 0);
  assert.ok(window.endMs >= window.startMs);
  assert.equal(keep.length, 10000);
});
