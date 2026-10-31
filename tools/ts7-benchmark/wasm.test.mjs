import assert from 'node:assert/strict';
import path from 'node:path';
import { before, test } from 'node:test';
import { initializeWasm, getWasmInfo } from '../../packages/typescript/wasm/runtime.mjs';
import { SyncRpcChannel } from '../../packages/typescript/wasm/channel.mjs';

let memory;
async function initializeWithMemory() {
  const original = WebAssembly.instantiate;
  WebAssembly.instantiate = async (...args) => {
    const result = await original(...args);
    memory = result.instance.exports.mem;
    return result;
  };
  try {
    await initializeWasm();
  } finally {
    WebAssembly.instantiate = original;
  }
}

before(async () => {
  if (process.env.SONARJS_TS7_WASM) await initializeWithMemory();
});

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

test(
  'WASM responses survive input reuse, memory growth and errors across sessions',
  {
    skip: !process.env.SONARJS_TS7_WASM,
  },
  () => {
    const args = ['--api', '--cwd', process.cwd()];
    const first = new SyncRpcChannel('unused', args);
    const second = new SyncRpcChannel('unused', args);
    try {
      const original = Buffer.from([0, 255, 128, 10, 13, 1]);
      const retained = first.requestBinarySync('echo', original);
      const previousMemory = memory.buffer;
      const previousSize = previousMemory.byteLength;
      const large = Buffer.alloc(previousSize + 17, 0xa5);
      const response = second.requestBinarySync('echo', large);
      assert.deepEqual(response, large);
      assert.ok(memory.buffer.byteLength > previousSize, 'exercise WASM memory growth');
      assert.deepEqual(retained, original, 'previous responses must not alias Go memory');
      const unicode = '\ufeffUnicode: \u00e9 \ud83d\ude00\u0000';
      assert.equal(first.requestSync('echo', unicode), unicode);
      assert.equal(first.lastBytesReceived, Buffer.byteLength(unicode));
      assert.equal(first.requestBinarySync('echo', Buffer.alloc(0)).length, 0);
      assert.equal(first.requestSync('echo', ''), '');
      assert.throws(() => first.requestSync('createSnapshot', '{'), /invalid|unmarshal|json/i);
      assert.equal(JSON.parse(second.requestSync('ping', '')), 'pong');
      assert.deepEqual(
        response,
        large,
        'subsequent requests must not overwrite retained binary data',
      );
    } finally {
      first.close();
      second.close();
    }
  },
);

test(
  'WASM filesystem callbacks cannot reenter the runtime or close an active session',
  {
    skip: !process.env.SONARJS_TS7_WASM,
  },
  () => {
    const first = new SyncRpcChannel('unused', [
      '--api',
      '--cwd',
      process.cwd(),
      '--callbacks=readFile,fileExists',
    ]);
    const second = new SyncRpcChannel('unused', ['--api', '--cwd', process.cwd()]);
    let called = false;
    const callback = name => {
      called = true;
      assert.throws(() => second.requestSync('ping', ''), /Reentrant/);
      assert.throws(() => first.close(), /during a compiler request/);
      assert.throws(
        () => new SyncRpcChannel('unused', ['--api', '--cwd', process.cwd()]),
        /during a compiler request/,
      );
      return JSON.stringify(
        name === 'readFile' ? { kind: 'missing' } : { kind: 'value', value: false },
      );
    };
    first.registerCallback('readFile', callback);
    first.registerCallback('fileExists', callback);
    try {
      first.requestSync(
        'createSnapshot',
        JSON.stringify({
          createPrograms: [
            {
              rootFiles: [path.join(process.cwd(), 'wasm-callback-test.ts')],
              compilerOptions: { noLib: true, types: [] },
            },
          ],
        }),
      );
      assert.equal(called, true);
      assert.equal(JSON.parse(second.requestSync('ping', '')), 'pong');
    } finally {
      first.close();
      second.close();
    }
  },
);
