import path from 'node:path';
import { wasmArtifact, getWasmBridge } from './runtime.mjs';

// Same synchronous SDK channel contract, but no process, pipe or message framing.
export class SyncRpcChannel {
  callbacks = new Map();
  lastBytesSent = 0;
  lastBytesReceived = 0;
  closed = false;
  constructor(_executable, args, collectTiming = false) {
    this.collectTiming = collectTiming;
    if (args.includes('--runExternalCode'))
      throw new Error('WASM content-mapper subprocess execution is not implemented');
    const cwdIndex = args.indexOf('--cwd');
    if (cwdIndex < 0 || !args[cwdIndex + 1]) throw new Error('WASM channel requires --cwd');
    const callbacks =
      args
        .find(arg => arg.startsWith('--callbacks='))
        ?.slice('--callbacks='.length)
        .split(',') ?? [];
    const result = getWasmBridge().open(
      JSON.stringify({
        cwd: args[cwdIndex + 1].replaceAll('\\', '/'),
        library: path.join(wasmArtifact(), 'sdk/lib').replaceAll('\\', '/'),
        callbacks,
        collectTiming,
        caseSensitive: args.includes('--useCaseSensitiveFileNames=true'),
      }),
      (name, payload) => {
        try {
          const callback = this.callbacks.get(name);
          if (!callback) throw new Error(`No WASM callback registered: ${name}`);
          return { value: callback(name, payload) };
        } catch (error) {
          return { error: String(error) };
        }
      },
    );
    if (result.error) throw new Error(result.error);
    this.id = result.id;
  }
  registerCallback(name, callback) {
    this.callbacks.set(name, callback);
  }
  unregisterCallback(name) {
    this.callbacks.delete(name);
  }
  requestBinarySync(method, payload) {
    if (this.closed) throw new Error('WASM channel is closed');
    const input = typeof payload === 'string' ? Buffer.from(payload) : payload;
    this.lastBytesSent = input.length;
    const result = getWasmBridge().request(this.id, method, input);
    if (result.error) throw new Error(result.error);
    this.lastBytesReceived = result.value.length;
    return Buffer.from(result.value.buffer, result.value.byteOffset, result.value.length);
  }
  requestSync(method, payload) {
    return this.requestBinarySync(method, payload).toString('utf8');
  }
  close() {
    if (this.closed) return;
    const result = getWasmBridge().close(this.id);
    if (result?.error) throw new Error(result.error);
    this.closed = true;
    this.callbacks.clear();
  }
}
