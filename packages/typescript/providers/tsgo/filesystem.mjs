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
import { minimatch } from 'minimatch';

const attempt = (operation, fallback) => {
  try {
    return operation();
  } catch {
    return fallback;
  }
};
export const normalize = (file, cwd = process.cwd()) => {
  const normalized = file.replaceAll('\\', '/');
  // Embedded Go compilers identify standard declarations with this rooted URI.
  if (normalized.startsWith('bundled:///')) return normalized;
  if (normalized.startsWith('/'))
    return (normalized.startsWith('//') ? '/' : '') + path.posix.normalize(normalized);
  if (/^[a-z]:\//i.test(normalized)) return path.posix.normalize(normalized);
  const base = cwd.replaceAll('\\', '/');
  const paths = /^(?:[a-z]:\/|\/\/)/i.test(base) ? path.win32 : path.posix;
  return paths.resolve(base, normalized).replaceAll('\\', '/');
};
export const entries = directory => {
  const files = [],
    directories = [];
  for (const entry of attempt(() => fs.readdirSync(directory, { withFileTypes: true }), [])) {
    if (attempt(() => fs.statSync(path.join(directory, entry.name)).isDirectory(), false))
      directories.push(entry.name);
    else files.push(entry.name);
  }
  return { files: files.sort(), directories: directories.sort(), symlinks: undefined };
};
export const sys = {
  useCaseSensitiveFileNames: process.platform !== 'win32' && process.platform !== 'darwin',
  newLine: '\n',
  args: process.argv.slice(2),
  readFile: file => attempt(() => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), undefined),
  fileExists: file => attempt(() => fs.statSync(file).isFile(), false),
  directoryExists: file => attempt(() => fs.statSync(file).isDirectory(), false),
  realpath: file => attempt(() => fs.realpathSync(file).replaceAll('\\', '/'), file),
  getCurrentDirectory: () => normalize(process.cwd()),
  getExecutingFilePath: () => process.execPath,
  getDirectories: directory => entries(directory).directories,
  resolvePath: normalize,
  write: text => process.stdout.write(text),
  writeFile: (file, text) => fs.writeFileSync(file, text),
  createDirectory: directory => fs.mkdirSync(directory, { recursive: true }),
  /**
   * @param {readonly string[]} [extensions]
   * @param {readonly string[]} [excludes]
   * @param {readonly string[]} [includes]
   */
  readDirectory(directory, extensions, excludes = [], includes = ['**/*'], depth = Infinity) {
    const result = [],
      seen = new Set();
    const excluded = name =>
      (excludes ?? []).some(
        pattern =>
          minimatch(name, pattern.replace(/^\.\//, ''), { dot: true }) ||
          minimatch(name, pattern.replace(/\/$/, '') + '/**', { dot: true }),
      );
    function visit(current, level) {
      const real = sys.realpath(current);
      if (seen.has(real)) return;
      seen.add(real);
      const relative = path.relative(directory, current).replaceAll('\\', '/');
      const listing = entries(current);
      for (const name of listing.files) {
        const file = relative ? relative + '/' + name : name;
        if (
          (!extensions || extensions.some(extension => name.endsWith(extension))) &&
          !excluded(file) &&
          (includes ?? ['**/*']).some(
            pattern =>
              minimatch(file, pattern.replace(/^\.\//, ''), { dot: true }) ||
              (!path.extname(pattern) && minimatch(file, pattern + '/**', { dot: true })),
          )
        )
          result.push(normalize(path.join(current, name)));
      }
      if (level < depth)
        for (const name of listing.directories) {
          if (!excluded(relative ? relative + '/' + name : name))
            visit(path.join(current, name), level + 1);
        }
    }
    visit(directory, 1);
    return result;
  },
};

// The native compiler rejects UNC network paths on every host (diagnostic 5116).
// Translate them at the transport boundary while the analyzer keeps its portable names.
export function nativePaths(value, reversed = new Map()) {
  if (typeof value === 'string' && value.startsWith('//')) {
    const root = /^\/\/[^/]+\/[^/]+/.exec(value)?.[0] ?? value;
    reversed.set(root.slice(1), root);
    return value.slice(1);
  }
  if (Array.isArray(value)) return value.map(item => nativePaths(item, reversed));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, nativePaths(item, reversed)]),
    );
  return value;
}

export function restorePaths(value, reversed) {
  if (typeof value === 'string') {
    for (const [encoded, original] of reversed)
      if (value === encoded || value.startsWith(encoded + '/'))
        return original + value.slice(encoded.length);
    return value;
  }
  if (Array.isArray(value)) return value.map(item => restorePaths(item, reversed));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, restorePaths(item, reversed)]),
    );
  return value;
}

// Every path-bearing callback uses the same namespace as the corresponding
// request and result. Keep file contents untouched, including leading // comments.
export function nativeFileSystem(host, reversed) {
  const callbacks = Object.create(host);
  callbacks.readFile = file => host.readFile(restorePaths(file, reversed));
  for (const method of [
    'fileExists',
    'directoryExists',
    'getDirectories',
    'realpath',
    'readDirectory',
    'getCurrentDirectory',
  ])
    if (host[method])
      callbacks[method] = (...args) =>
        nativePaths(host[method](...args.map(arg => restorePaths(arg, reversed))), reversed);
  return callbacks;
}
