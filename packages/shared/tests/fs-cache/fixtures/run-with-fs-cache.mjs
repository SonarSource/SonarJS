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
import { pathToFileURL } from 'node:url';
import { installFsCache } from '../../../src/fs-cache/hook.mjs';

const [archivePath, rootDir, target, ...targetArguments] = process.argv.slice(2);
if (!archivePath || !rootDir || !target) {
  throw new Error('Expected filesystem cache archive, root, and target module arguments');
}

process.argv = [process.argv[0], target, ...targetArguments];
const session = installFsCache().beginAnalysis({ archivePath, rootDir });
try {
  await import(pathToFileURL(target).href);
} finally {
  session.end();
}
