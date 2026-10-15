import fs from 'node:fs';
import path from 'node:path';
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let initialization;
let artifact;
let metadata;
let runtimeFailure;

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
