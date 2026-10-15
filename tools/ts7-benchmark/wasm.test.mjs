import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeWasm, getWasmInfo } from '../../packages/typescript/wasm/runtime.mjs';
import { SyncRpcChannel } from '../../packages/typescript/wasm/channel.mjs';

test(
  'WASM channel preserves binary data, sessions, errors, timing and closure',
  {
    skip: !process.env.SONARJS_TS7_WASM,
  },
  async () => {
    await initializeWasm();
    assert.match(getWasmInfo().revision, /^[a-f0-9]{40}$/);
    const args = ['--api', '--cwd', process.cwd(), '--useCaseSensitiveFileNames=false'];
    const first = new SyncRpcChannel('unused', args, true);
    const second = new SyncRpcChannel('unused', args, false);
    try {
      assert.notEqual(first.id, second.id);
      const bytes = Uint8Array.from([0, 255, 128, 10, 13, 1]);
      assert.deepEqual([...first.requestBinarySync('echo', bytes)], [...bytes]);
      assert.equal(first.lastBytesSent, bytes.length);
      assert.equal(first.lastBytesReceived, bytes.length);
      assert.equal(JSON.parse(first.requestSync('ping', '')), 'pong');
      const timing = JSON.parse(first.requestSync('getServerTiming', ''));
      assert.equal(timing.enabled, true);
      assert.equal(timing.totals.requestCount, 2);
      assert.ok(timing.totals.totalProcessingTimeMs >= 0);
      assert.equal(JSON.parse(second.requestSync('getServerTiming', '')).enabled, false);
      first.requestSync('resetServerTiming', '');
      assert.equal(JSON.parse(first.requestSync('getServerTiming', '')).totals.requestCount, 0);
      assert.throws(
        () => first.requestSync('notAnApiMethod', '{}'),
        /unknown|invalid|unsupported/i,
      );
      first.close();
      assert.throws(() => first.requestSync('ping', ''), /closed/);
      assert.equal(JSON.parse(second.requestSync('ping', '')), 'pong');
    } finally {
      first.close();
      second.close();
    }
  },
);
