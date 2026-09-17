#!/usr/bin/env node
import { isMainThread } from 'node:worker_threads';

if (isMainThread) {
  /**
   * This script expects following arguments
   *
   * port - port number on which server.mjs should listen
   * host - host address on which server.mjs should listen
   * debugMemory - print memory usage
   * timeoutSeconds - timeout for the node server to wait before shutting down. If not provided or 0,
   */

  const port = process.argv[2];
  const host = process.argv[3];
  const debugMemory = process.argv[4] === 'true';
  const timeoutSeconds = Number(process.argv[5]) || 0;

  Promise.resolve().then(async () => {
    const [{ startAnalyzeProjectServer }, { createAnalyzeProjectWorker }] = await Promise.all([
      import('./lib/grpc/src/analyze-project-server.js'),
      import('./lib/grpc/src/analyze-project-worker/create-worker.js'),
    ]);
    return startAnalyzeProjectServer(
      Number.parseInt(port, 10),
      host,
      await createAnalyzeProjectWorker(new URL(import.meta.url), { debugMemory }),
      debugMemory,
      timeoutSeconds,
    );
  });
} else {
  void import('./lib/grpc/src/analyze-project-worker.js');
}
