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

const loaderUrl = import.meta.url;
const classes = new Set([
  'Dir',
  'Dirent',
  'FSWatcher',
  'ReadStream',
  'StatWatcher',
  'Stats',
  'WriteStream',
  '_StatWatcher',
]);

function wrapperSource(moduleExports, requireExpression, objectName) {
  const lines = [
    "import { createRequire } from 'node:module';",
    `const require = createRequire(${JSON.stringify(loaderUrl)});`,
    `const ${objectName} = ${requireExpression};`,
  ];

  for (const [name, value] of Object.entries(moduleExports)) {
    if (!/^[$A-Z_a-z][$\w]*$/.test(name) || name === 'default') continue;
    if (typeof value === 'function' && !classes.has(name)) {
      lines.push(`export function ${name}(...args) { return ${objectName}.${name}(...args); }`);
    } else {
      lines.push(`export const ${name} = ${objectName}.${name};`);
    }
  }
  for (const name of ['realpath', 'realpathSync']) {
    if (typeof moduleExports[name]?.native === 'function') {
      lines.push(
        `Object.defineProperty(${name}, 'native', { value: (...args) => ${objectName}.${name}.native(...args) });`,
      );
    }
  }
  lines.push(`export default ${objectName};`);
  return lines.join('\n');
}

const fsSource = wrapperSource(fs, "require('node:fs')", 'fs');
const fsPromisesSource = wrapperSource(fs.promises, "require('node:fs').promises", 'fsPromises');

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'fs' || specifier === 'node:fs') {
    return { shortCircuit: true, url: 'sonarjs:fs-cache/fs' };
  }
  if (specifier === 'fs/promises' || specifier === 'node:fs/promises') {
    return { shortCircuit: true, url: 'sonarjs:fs-cache/fs-promises' };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === 'sonarjs:fs-cache/fs') {
    return { format: 'module', shortCircuit: true, source: fsSource };
  }
  if (url === 'sonarjs:fs-cache/fs-promises') {
    return { format: 'module', shortCircuit: true, source: fsPromisesSource };
  }
  return nextLoad(url, context);
}
