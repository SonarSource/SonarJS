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
import path from 'node:path';
import { getDefaultLibFileName } from 'tsc-ts-source/packages/tsc-ts/src/compiler/program-utilities.ts';
import { compilerOptionsFromApi } from 'tsc-ts-source/packages/tsc-ts/src/library/options.ts';
import { DirectoryEntries } from 'tsc-ts-source/packages/tsc-ts/src/compiler/file-system.ts';
import { readDirectory as matchDirectory } from 'tsc-ts-source/packages/tsc-ts/src/compiler/vfs-match.ts';

const attempt = (invoke, fallback) => {
  try {
    return invoke();
  } catch {
    return fallback;
  }
};
const disk = {
  useCaseSensitiveFileNames: process.platform !== 'win32' && process.platform !== 'darwin',
  readFile: file => attempt(() => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), undefined),
  fileExists: file => attempt(() => fs.statSync(file).isFile(), false),
  directoryExists: file => attempt(() => fs.statSync(file).isDirectory(), false),
  realpath: file => attempt(() => fs.realpathSync(file).replaceAll('\\', '/'), file),
  getAccessibleEntries: directory => {
    const entries = attempt(() => fs.readdirSync(directory, { withFileTypes: true }), []);
    const files = [],
      directories = [];
    for (const entry of entries) {
      if (
        entry.isDirectory() ||
        (entry.isSymbolicLink() && disk.directoryExists(path.join(directory, entry.name)))
      )
        directories.push(entry.name);
      else files.push(entry.name);
    }
    return new DirectoryEntries(files.sort(), directories.sort(), undefined);
  },
};
export const sys = {
  ...disk,
  args: process.argv.slice(2),
  newLine: '\n',
  getCurrentDirectory: () => process.cwd().replaceAll('\\', '/'),
  getExecutingFilePath: () => __filename,
  getDirectories: directory => Array.from(disk.getAccessibleEntries(directory).directories),
  /** @type {import('typescript').System['readDirectory']} */
  readDirectory: (
    directory,
    extensions = ['.ts', '.tsx', '.d.ts'],
    excludes = [],
    includes = ['**/*'],
    depth,
  ) =>
    matchDirectory(
      disk,
      sys.getCurrentDirectory(),
      directory,
      extensions,
      excludes ?? [],
      includes ?? ['**/*'],
      depth ?? Number.MAX_SAFE_INTEGER,
    ),
  write: text => process.stdout.write(text),
  writeFile: (file, data) => fs.writeFileSync(file, data),
  createDirectory: directory => fs.mkdirSync(directory, { recursive: true }),
  resolvePath: file => path.resolve(file).replaceAll('\\', '/'),
};
export function getDefaultLibFilePath(options = {}) {
  // This provider is built as runtime.cjs, then inlined into the bridge CJS bundle.
  const directory =
    path.basename(__filename) === 'runtime.cjs'
      ? path.join(path.dirname(__filename), 'lib')
      : path.dirname(__filename);
  return path
    .join(directory, getDefaultLibFileName(compilerOptionsFromApi(options)))
    .replaceAll('\\', '/');
}
export function createHostFileSystem(host) {
  return {
    useCaseSensitiveFileNames:
      typeof host.useCaseSensitiveFileNames === 'function'
        ? host.useCaseSensitiveFileNames()
        : (host.useCaseSensitiveFileNames ?? true),
    readFile: file => host.readFile(file),
    fileExists: file => host.fileExists(file),
    directoryExists: directory => host.directoryExists?.(directory) ?? true,
    realpath: file => host.realpath?.(file) ?? file,
    getAccessibleEntries: directory => {
      const files = host
        .readDirectory(directory, undefined, undefined, ['*'], 1)
        .map(file => path.basename(file));
      return new DirectoryEntries(files, host.getDirectories?.(directory) ?? [], undefined);
    },
  };
}
