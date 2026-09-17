/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import fs from 'node:fs';
import { promisify } from 'node:util';
import { isMainThread, parentPort, Worker } from 'node:worker_threads';

if (isMainThread) {
  const worker = new Worker(new URL(import.meta.url));
  worker.once('message', message => console.log(JSON.stringify(message)));
} else {
  await import('../../../../../lib/grpc/src/analyze-project-worker.js');
  const installationSymbol = Symbol.for('sonarjs.filesystemCache.installation');
  while (globalThis[installationSymbol] === undefined) {
    await new Promise(resolve => setImmediate(resolve));
  }
  const installation = globalThis[installationSymbol];
  const descriptor = fs.openSync(import.meta.filename, 'r');
  const readBuffer = Buffer.alloc(2);
  const readResult = await promisify(fs.read)(descriptor, readBuffer, 0, readBuffer.length, 0);
  fs.closeSync(descriptor);
  parentPort.postMessage({
    existsPromisify: await promisify(fs.exists)(import.meta.filename),
    installed: installation !== undefined,
    nativePassthrough: fs.existsSync(import.meta.filename),
    readPromisify: {
      bufferPreserved: readResult.buffer === readBuffer,
      bytesRead: readResult.bytesRead,
    },
  });
  parentPort.close();
}
