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
import '../../../../../lib/shared/src/fs-cache/worker-register.mjs';
import fs from 'node:fs';
import { isMainThread, parentPort, Worker } from 'node:worker_threads';

if (isMainThread) {
  const worker = new Worker(new URL(import.meta.url));
  worker.once('message', message => console.log(JSON.stringify(message)));
} else {
  const installation = globalThis[Symbol.for('sonarjs.filesystemCache.installation')];
  parentPort.postMessage({
    active: installation?.archive !== undefined,
    installed: installation !== undefined,
    nativePassthrough: fs.existsSync(import.meta.filename),
  });
}
