import path from 'node:path';
import { wasmArtifact, openWasm, requestWasm, closeWasm } from './runtime.mjs';

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
    const result = openWasm(
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
    return this.request(method, payload, true);
  }
  requestSync(method, payload) {
    return this.request(method, payload, false);
  }
  request(method, payload, binary) {
    if (this.closed) throw new Error('WASM channel is closed');
    this.lastBytesSent = typeof payload === 'string' ? Buffer.byteLength(payload) : payload.length;
    const result = requestWasm(this.id, method, payload, binary);
    this.lastBytesReceived = result.length;
    return result.value;
  }
  close() {
    if (this.closed) return;
    const result = closeWasm(this.id);
    if (result?.error) throw new Error(result.error);
    this.closed = true;
    this.callbacks.clear();
  }
}
