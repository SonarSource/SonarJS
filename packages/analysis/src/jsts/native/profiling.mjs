import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Pinned SDK internals used only by the benchmark's optional instrumentation.
export async function attachNativeProfiler(profiler) {
  const require = createRequire(import.meta.url);
  const api = path.join(
    path.dirname(require.resolve('typescript-native/package.json')),
    'dist/api',
  );
  const { TimingCollector } = await import(pathToFileURL(path.join(api, 'timing.js')).href);
  const { Client } = await import(pathToFileURL(path.join(api, 'sync/client.js')).href);
  return [profiler.attachTimingCollector(TimingCollector), profiler.attachClient(Client)];
}
