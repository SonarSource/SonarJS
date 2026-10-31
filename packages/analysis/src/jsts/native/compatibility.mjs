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
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const transport = new URL('./native-transport.mjs', import.meta.url).href;
const require = createRequire(import.meta.url);
const nativeChannel = pathToFileURL(
  path.join(
    path.dirname(require.resolve('typescript-native/package.json')),
    'dist/api/syncChannel.js',
  ),
).href;

// Keep synchronous transport primitives outside the analysis filesystem hooks.
// Compiler imports themselves are routed by the shared typescript module.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'node:fs' && context.parentURL === nativeChannel) {
      return nextResolve(transport, context);
    }
    return nextResolve(specifier, context);
  },
});

const nativeProcesses = new Map();
globalThis[Symbol.for('sonarjs.ts7.processes')] = nativeProcesses;
const originalSpawn = childProcess.spawn;
childProcess.spawn = function (executable, ...args) {
  const child = Reflect.apply(originalSpawn, this, [executable, ...args]);
  if (
    child.pid &&
    (String(executable).includes('@typescript') ||
      (Array.isArray(args[0]) && args[0].includes('--api')))
  ) {
    nativeProcesses.set(child.pid, child);
    child.once('exit', () => nativeProcesses.delete(child.pid));
  }
  return child;
};
syncBuiltinESMExports();
