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
import { serverFS } from 'typescript-native/fs';

/** Compiler-facing callbacks; the supplied Node fs can remain hooked for replay. */
export function createNativeFileSystem({
  cwd,
  requestFiles = new Map(),
  contentCache = new Map(),
  io = fs,
  caseSensitive = process.platform !== 'win32',
  skipOutsideNodeModules = false,
  libraryDirectories = [],
  captureProvidedFile = () => {},
  hasArchivedFileContent = () => false,
}) {
  const canonical = file => {
    const normalized = path.resolve(cwd, file).replaceAll('\\', '/');
    return caseSensitive ? normalized : normalized.toLowerCase();
  };
  const root = canonical(cwd);
  const libraries = libraryDirectories.map(canonical);
  const within = (file, directory) => file === directory || file.startsWith(`${directory}/`);
  const allowed = file =>
    !skipOutsideNodeModules ||
    !canonical(file).includes('/node_modules/') ||
    within(canonical(file), root) ||
    libraries.some(directory => within(canonical(file), directory));
  const displayPaths = new Map(
    [...contentCache.keys(), ...requestFiles.keys()].map(file => [
      canonical(file),
      path.resolve(cwd, file).replaceAll('\\', '/'),
    ]),
  );
  const requests = new Map([...requestFiles].map(([file, text]) => [canonical(file), text]));
  const cache = new Map([...contentCache].map(([file, text]) => [canonical(file), text]));
  const overlay = file => requests.get(canonical(file)) ?? cache.get(canonical(file));
  // Index parent directories once instead of rescanning every cached file for
  // each compiler probe. This index grows with successful reads in this batch.
  const overlayDirectories = new Set();
  const indexDirectories = file => {
    let directory = path.dirname(file).replaceAll('\\', '/');
    while (true) {
      overlayDirectories.add(directory);
      const parent = path.dirname(directory).replaceAll('\\', '/');
      if (parent === directory) break;
      directory = parent;
    }
  };
  for (const file of [...requests.keys(), ...cache.keys()]) indexDirectories(file);
  const overlayDirectory = file => overlayDirectories.has(canonical(file));
  const counts = {};
  let fatalError;

  const measure =
    (name, fn) =>
    (...args) => {
      const start = performance.now();
      const metric = (counts[name] ??= { count: 0, ms: 0, failures: 0 });
      metric.count++;
      try {
        if (fatalError) throw fatalError;
        return fn(...args);
      } catch (error) {
        metric.failures++;
        fatalError ??= error;
        throw error;
      } finally {
        metric.ms += performance.now() - start;
      }
    };
  const missing = (fn, fallback) => {
    try {
      return fn();
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return fallback;
      throw error;
    }
  };
  const stat = file => {
    if (!allowed(file)) return undefined;
    const text = overlay(file);
    if (text !== undefined) {
      return { mode: 0o100644, size: Buffer.byteLength(text), mtime: new Date(0) };
    }
    return missing(() => io.statSync(file), undefined);
  };
  const callbacks = {
    readFile: measure('readFile', file => {
      if (!allowed(file)) return undefined;
      const text = overlay(file);
      if (text !== undefined) {
        if (requests.has(canonical(file))) captureProvidedFile(file, text);
        return text;
      }
      const content = missing(() => decodeText(io.readFileSync(file)), undefined);
      if (content !== undefined) {
        const key = canonical(file);
        cache.set(key, content);
        indexDirectories(key);
      }
      return content;
    }),
    fileExists: measure('fileExists', file => {
      if (!allowed(file)) return false;
      if (overlay(file) !== undefined || hasArchivedFileContent(file)) return true;
      return missing(() => io.statSync(file).isFile(), false);
    }),
    directoryExists: measure('directoryExists', file => {
      if (!allowed(file)) return false;
      if (overlayDirectory(file)) return true;
      return missing(() => io.statSync(file).isDirectory(), false);
    }),
    getAccessibleEntries: measure('getAccessibleEntries', directory => {
      const result = { files: [], directories: [], symlinks: [] };
      if (!allowed(directory)) return result;
      const entries = missing(() => io.readdirSync(directory, { withFileTypes: true }), []);
      for (const entry of entries) {
        const file = path.join(directory, entry.name);
        const isLink = entry.isSymbolicLink();
        const info = isLink ? missing(() => io.statSync(file), undefined) : entry;
        if (info?.isFile()) result.files.push(entry.name);
        else if (info?.isDirectory()) result.directories.push(entry.name);
        else continue;
        if (isLink) result.symlinks.push(entry.name);
      }
      const prefix = `${canonical(directory)}/`;
      for (const candidate of displayPaths.keys()) {
        if (!candidate.startsWith(prefix)) continue;
        const relative = displayPaths.get(candidate).slice(prefix.length);
        const slash = relative.indexOf('/');
        const target = slash < 0 ? result.files : result.directories;
        const name = slash < 0 ? relative : relative.slice(0, slash);
        if (!target.includes(name)) target.push(name);
      }
      result.files.sort();
      result.directories.sort();
      result.symlinks.sort();
      return result;
    }),
    realpath: measure('realpath', file => {
      if (!allowed(file) || overlay(file) !== undefined) return file;
      return missing(() => io.realpathSync(file), file);
    }),
    stat: measure('stat', stat),
    writeFile: serverFS.noop,
    removeFile: serverFS.noop,
  };
  return {
    callbacks,
    updateRequestFiles(files, changedPaths = []) {
      for (const file of changedPaths) {
        const key = canonical(file);
        for (const candidate of new Set([...requests.keys(), ...cache.keys()])) {
          if (within(candidate, key)) {
            requests.delete(candidate);
            cache.delete(candidate);
            displayPaths.delete(candidate);
          }
        }
      }
      for (const [file, text] of files) {
        const key = canonical(file);
        requests.set(key, text);
        cache.delete(key);
        displayPaths.set(key, path.resolve(cwd, file).replaceAll('\\', '/'));
      }
      overlayDirectories.clear();
      for (const file of [...requests.keys(), ...cache.keys()]) indexDirectories(file);
    },
    assertHealthy() {
      if (fatalError) throw fatalError;
    },
    getMetrics() {
      return structuredClone(counts);
    },
  };
}

function decodeText(content) {
  if (typeof content === 'string') return content;
  if (content[0] === 0xff && content[1] === 0xfe) return content.subarray(2).toString('utf16le');
  if (content[0] === 0xfe && content[1] === 0xff) {
    return Buffer.from(content.subarray(2)).swap16().toString('utf16le');
  }
  const start = content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf ? 3 : 0;
  return content.subarray(start).toString('utf8');
}
