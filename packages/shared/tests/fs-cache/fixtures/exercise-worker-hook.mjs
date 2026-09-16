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
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { installFsCache } from '../../../src/fs-cache/hook.mjs';

if (isMainThread) {
  const [root, archivePath] = process.argv.slice(2);
  const main = readFileSync(path.join(root, 'main-input.ts'), 'utf8');
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { archivePath, rootDir: root },
  });
  const message = await new Promise((resolve, reject) => {
    worker.once('message', resolve);
    worker.once('error', reject);
  });
  console.log(`${main}|${message}`);
} else {
  const session = installFsCache().beginAnalysis(workerData);
  try {
    const file = path.join(workerData.rootDir, 'worker-input.ts');
    parentPort.postMessage(readFileSync(file, 'utf8'));
  } finally {
    session.end();
  }
}
