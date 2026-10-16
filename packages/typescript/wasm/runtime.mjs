import fs from 'node:fs';
import path from 'node:path';
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let initialization;
let artifact;
let metadata;
let runtimeFailure;
let exports;
let requesting = false;
let inputPointer = 0;
let inputCapacity = 0;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
const methods = new Map();

export function getWasmInfo() {
  if (!metadata) throw new Error('Initialize the WASM compiler first');
  return { ...metadata, sdkRoot: path.join(artifact, 'sdk') };
}

export function initializeWasm() {
  return (initialization ??= initialize());
}

async function initialize() {
  artifact = process.env.SONARJS_TS7_WASM;
  if (!artifact || !path.isAbsolute(artifact))
    throw new Error('SONARJS_TS7_WASM must name an absolute directory produced by build-wasm.mjs');
  metadata = JSON.parse(fs.readFileSync(path.join(artifact, 'build.json'), 'utf8'));
  const sdk = path.join(artifact, 'sdk');
  const manifest = JSON.parse(fs.readFileSync(path.join(sdk, 'package.json'), 'utf8'));
  if (manifest.gitHead !== metadata.revision) throw new Error('WASM and JS SDK revision mismatch');
  metadata.version = manifest.version;
  metadata.bridge = process.env.SONARJS_WASM_BRIDGE ?? 'syscall';
  if (!['direct', 'syscall'].includes(metadata.bridge))
    throw new Error('SONARJS_WASM_BRIDGE must be direct or syscall');
  const channel = new URL('./channel.mjs', import.meta.url).href;
  const privateRoots = [
    new URL('../', import.meta.url).href,
    new URL('../../analysis/src/jsts/native/', import.meta.url).href,
    new URL('../../../lib/analysis/src/jsts/native/', import.meta.url).href,
  ];
  registerHooks({
    resolve(specifier, context, next) {
      // Only private native SDK imports are redirected; public typescript remains our facade.
      const privateImporter = privateRoots.some(root => context.parentURL?.startsWith(root));
      if (privateImporter && specifier === 'typescript-native/package.json')
        return { url: pathToFileURL(path.join(sdk, 'package.json')).href, shortCircuit: true };
      if (privateImporter && specifier.startsWith('typescript-native/')) {
        const key = `./${specifier.slice('typescript-native/'.length)}`;
        const target = manifest.exports[key];
        const file = typeof target === 'string' ? target : target?.default;
        if (!file) throw new Error(`WASM SDK does not export ${key}`);
        return { url: pathToFileURL(path.resolve(sdk, file)).href, shortCircuit: true };
      }
      const resolved = next(specifier, context);
      if (resolved.url === pathToFileURL(path.join(sdk, 'dist/api/syncChannel.js')).href)
        return { url: channel, shortCircuit: true };
      return resolved;
    },
  });
  // Go's standard host shim needs real Node filesystem operations if used at startup.
  globalThis.fs ??= fs;
  require(path.join(artifact, 'wasm_exec.cjs'));
  const go = new globalThis.Go();
  // Go's background housekeeping must not keep a completed Node worker alive.
  // This shim is tied to the copied, matching Go runtime, not a compiler API.
  const schedule = go.importObject.gojs['runtime.scheduleTimeoutEvent'];
  go.importObject.gojs['runtime.scheduleTimeoutEvent'] = sp => {
    const id = go._nextCallbackTimeoutID;
    schedule(sp);
    go._scheduledTimeouts.get(id).unref();
  };
  const { instance } = await WebAssembly.instantiate(
    fs.readFileSync(path.join(artifact, 'typescript.wasm')),
    go.importObject,
  );
  exports = instance.exports;
  if (metadata.bridge === 'direct' && (!exports.sonarReserve || !exports.sonarRequest))
    throw new Error('Rebuild WASM to enable the direct bridge');
  const execution = go.run(instance).then(
    () => {
      runtimeFailure = new Error('WASM compiler runtime exited');
    },
    error => {
      runtimeFailure = error;
    },
  );
  if (!globalThis.__sonarjsWasm) {
    await execution;
    throw runtimeFailure ?? new Error('WASM exited without installing its API');
  }
  return globalThis.__sonarjsWasm;
}

export const wasmArtifact = () => artifact;
export function getWasmBridge() {
  if (runtimeFailure) throw runtimeFailure;
  if (!globalThis.__sonarjsWasm) throw new Error('Initialize the WASM compiler first');
  return globalThis.__sonarjsWasm;
}

export function requestWasm(id, method, input, binary) {
  const bridge = getWasmBridge();
  // One runtime-wide input buffer is shared by all sessions. A filesystem
  // callback must not recursively issue compiler requests or close sessions.
  if (requesting) throw new Error('Reentrant WASM compiler requests are unsupported');
  requesting = true;
  try {
    if (metadata.bridge === 'syscall') {
      const result = bridge.request(
        id,
        method,
        typeof input === 'string' ? Buffer.from(input) : input,
      );
      if (result.error) throw new Error(result.error);
      const bytes = Buffer.from(result.value.buffer, result.value.byteOffset, result.value.length);
      return { value: binary ? bytes : bytes.toString('utf8'), length: bytes.length };
    }
    let encodedMethod = methods.get(method);
    if (!encodedMethod) {
      encodedMethod = Buffer.from(method);
      if (methods.size >= 256) methods.clear();
      methods.set(method, encodedMethod);
    }
    const inputLength = typeof input === 'string' ? Buffer.byteLength(input) : input.length;
    const size = encodedMethod.length + inputLength;
    if (!size || size > 2 ** 30) throw new Error('WASM request size exceeds bridge limit');
    if (size > inputCapacity) {
      const capacity = 2 ** Math.ceil(Math.log2(Math.max(4096, size)));
      inputPointer = exports.sonarReserve(capacity) >>> 0;
      if (!inputPointer) throw new Error('Cannot reserve WASM request buffer');
      inputCapacity = capacity;
    }
    // Every Go call can grow memory, detaching earlier ArrayBuffer views.
    const destination = new Uint8Array(exports.mem.buffer, inputPointer, size);
    destination.set(encodedMethod);
    if (typeof input === 'string')
      encoder.encodeInto(input, destination.subarray(encodedMethod.length));
    else destination.set(input, encodedMethod.length);
    const descriptor = exports.sonarRequest(id, encodedMethod.length, inputLength) >>> 0;
    const fields = new DataView(exports.mem.buffer, descriptor, 12);
    const offset = fields.getUint32(0, true);
    const length = fields.getUint32(4, true);
    const failed = fields.getUint32(8, true);
    const bytes = new Uint8Array(exports.mem.buffer, offset, length);
    if (failed) throw new Error(decoder.decode(bytes));
    // AST binary decoders retain their input. Never expose reusable Go memory
    // to callers; JSON strings can be decoded immediately without that copy.
    return { value: binary ? Buffer.from(bytes) : decoder.decode(bytes), length };
  } finally {
    requesting = false;
  }
}

export function closeWasm(id) {
  if (requesting) throw new Error('Cannot close a WASM session during a compiler request');
  return getWasmBridge().close(id);
}

export function openWasm(options, callback) {
  if (requesting) throw new Error('Cannot open a WASM session during a compiler request');
  return getWasmBridge().open(options, callback);
}
