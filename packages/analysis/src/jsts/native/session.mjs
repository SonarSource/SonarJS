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
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { compilerOptionsToJson } from 'typescript/control';
import { API } from 'typescript-native/sync';
import { createFileSystemLayer } from 'typescript-native/fs';
import { createNativeFileSystem } from './filesystem.mjs';
import {
  getCurrentFilesContext,
  getSourceFileContentCache,
} from '../program/cache/sourceFileCache.js';
import {
  captureProvidedFile,
  hasArchivedFileContent,
  getFileSystemCaseSensitivity,
} from '../../../../shared/src/fs-cache/hook.js';

const { createCompatibleProgram } = await import(
  pathToFileURL(
    path.join(
      path.dirname(createRequire(import.meta.url).resolve('typescript/package.json')),
      'native-compat.mjs',
    ),
  ).href
);

const sessions = new Set();
const nativePrograms = new WeakMap();
const programSessions = new WeakMap();
let unsupportedObserver;

export function getNativeLibraryDirectory() {
  const require = createRequire(import.meta.url);
  if (process.env.SONARJS_TYPESCRIPT_BACKEND === 'wasm')
    return path
      .join(path.dirname(require.resolve('typescript-native/package.json')), 'lib')
      .replaceAll('\\', '/');
  return path
    .join(
      path.dirname(
        require.resolve(`@typescript/typescript-${process.platform}-${process.arch}/package.json`),
      ),
      'lib',
    )
    .replaceAll('\\', '/');
}

export function createNativePrograms(programOptions, settings = {}) {
  const key = Symbol.for('sonarjs.ts7.unsupported');
  if (globalThis[key] !== unsupportedObserver || !unsupportedObserver) {
    const previous = globalThis[key];
    unsupportedObserver = member => {
      previous?.(member);
      for (const session of sessions)
        session.failures.push({ method: member, message: 'Unsupported native adapter member' });
    };
    globalThis[key] = unsupportedObserver;
  }
  const nativeLibrary = getNativeLibraryDirectory();
  const cwd = settings.cwd ?? programOptions[0].host?.getCurrentDirectory() ?? process.cwd();
  const requestFiles =
    settings.requestFiles ??
    new Map(
      Object.entries(getCurrentFilesContext() ?? {})
        .filter(([, value]) => value.fileContent !== undefined)
        .map(([file, value]) => [file, value.fileContent]),
    );
  const timings = {};
  const failures = [];
  const adapter = createNativeFileSystem({
    cwd,
    requestFiles,
    contentCache: getSourceFileContentCache(),
    skipOutsideNodeModules: settings.skipOutsideNodeModules ?? false,
    captureProvidedFile,
    hasArchivedFileContent,
    libraryDirectories: [nativeLibrary, path.dirname(ts.getDefaultLibFilePath({}))],
    caseSensitive: getFileSystemCaseSensitivity() ?? process.platform !== 'win32',
  });
  let api;
  let snapshot;
  try {
    let start = performance.now();
    const callbacks = { ...adapter.callbacks, ...settings.fs };
    api = new API({
      cwd,
      fs: settings.instrumentHost ? settings.instrumentHost(callbacks) : callbacks,
      collectTiming: settings.collectTiming ?? false,
      useCaseSensitiveFileNames: getFileSystemCaseSensitivity(),
    });
    timings.apiInitializationMs = performance.now() - start;
    start = performance.now();
    const parameters = programOptions.map(options => {
      const parsed = api.parseJsonConfigFileContent(
        {
          compilerOptions: compilerOptionsToJson(options.options),
          files: options.rootNames.slice(0, 1),
        },
        { configDirectory: cwd },
      );
      if (parsed.errors.length) throw new Error(JSON.stringify(parsed.errors));
      return {
        rootFiles: options.rootNames,
        compilerOptions: parsed.options,
        options: { projectReferences: options.projectReferences },
      };
    });
    timings.nativeOptionsMs = performance.now() - start;
    start = performance.now();
    snapshot = api.createSnapshot({
      ...(settings.fileSystem ? { fileSystem: settings.fileSystem } : {}),
      ...(settings.filesystem === 'layer'
        ? { fileSystem: createFileSystemLayer([...requestFiles]) }
        : {}),
      createPrograms: parameters,
    });
    timings.snapshotCreationMs = performance.now() - start;
    let rawPrograms = snapshot.operation.createdPrograms ?? [];
    if (rawPrograms.length !== programOptions.length)
      throw new Error('Native snapshot did not create the requested programs');
    const register = rawProgram => {
      const program = createCompatibleProgram(
        api,
        snapshot.getProject(rawProgram.id),
        (method, error) => {
          failures.push({ method, message: error.message });
          settings.onCheckerError?.(method, error);
        },
      );
      nativePrograms.set(program, rawProgram);
      return program;
    };
    let programs = rawPrograms.map(register);
    let disposed = false;
    const session = {
      api,
      get snapshot() {
        return snapshot;
      },
      adapter,
      get programs() {
        return programs;
      },
      get rawPrograms() {
        return rawPrograms;
      },
      timings,
      failures,
      update(files, fsEvents = []) {
        if (disposed) throw new Error('Cannot update a disposed native session');
        session.assertHealthy();
        for (const [file, text] of files) captureProvidedFile(file, text);
        const changedFiles = new Map(
          [...files].filter(([file, text]) => requestFiles.get(file) !== text),
        );
        if (!changedFiles.size && !fsEvents.length) return;
        try {
          const knownFiles = new Set(rawPrograms.flatMap(program => program.getSourceFileNames()));
          const key = file => {
            const absolute = path.resolve(cwd, file).replaceAll('\\', '/');
            return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
          };
          const affectedPaths = new Set(fsEvents);
          for (const event of fsEvents) {
            for (const file of knownFiles) {
              if (key(file).startsWith(`${key(event)}/`)) affectedPaths.add(file);
            }
          }
          adapter.updateRequestFiles(files, [...affectedPaths]);
          const created = [];
          const deleted = [];
          for (const file of affectedPaths) {
            requestFiles.delete(file);
            if (adapter.callbacks.fileExists(file)) {
              changedFiles.set(file, adapter.callbacks.readFile(file));
              if (!knownFiles.has(file)) created.push(file);
            } else if (adapter.callbacks.directoryExists(file)) {
              created.push(file);
            } else {
              deleted.push(file);
            }
          }
          for (const [file, text] of files) requestFiles.set(file, text);
          const previous = snapshot;
          const next = snapshot.update({
            fileSystem: {
              kind: 'layer',
              files: Object.fromEntries(changedFiles),
              removedPaths: deleted,
            },
            fileNotifications: { changed: [...changedFiles.keys()], created, deleted },
            ensurePrograms: true,
          });
          if (next === previous) return;
          const ids = rawPrograms.map(program => program.id);
          for (const program of programs) {
            nativePrograms.delete(program);
            programSessions.delete(program);
          }
          snapshot = next;
          rawPrograms = ids.map(id => snapshot.getProject(id).program);
          programs = rawPrograms.map(register);
          for (const program of programs) programSessions.set(program, session);
          previous.dispose();
        } catch (error) {
          session.dispose();
          throw error;
        }
      },
      assertHealthy() {
        adapter.assertHealthy();
        if (failures.length) throw new Error(`Native checker failed: ${JSON.stringify(failures)}`);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        sessions.delete(session);
        for (const program of programs) {
          nativePrograms.delete(program);
          programSessions.delete(program);
        }
        try {
          snapshot.dispose();
        } finally {
          api.close();
        }
      },
    };
    for (const program of programs) programSessions.set(program, session);
    sessions.add(session);
    return session;
  } catch (error) {
    try {
      snapshot?.dispose();
    } finally {
      api?.close();
    }
    throw error;
  }
}

export function getNativeSession(program) {
  return programSessions.get(program);
}

export function assertNativeProgramsHealthy() {
  for (const session of sessions) session.assertHealthy();
}

/** @param {import('typescript').Program} program @returns {string[]} */
export function getProgramFileNames(program) {
  const native = nativePrograms.get(program);
  return native ? native.getSourceFileNames() : program.getSourceFiles().map(file => file.fileName);
}

export function getNativeCompilerVersion() {
  return createRequire(import.meta.url)('typescript-native/package.json').version;
}

/** Explicit disposal is required: native processes/snapshots are not JS heap objects. */
export function releaseNativePrograms() {
  let failure;
  for (const session of [...sessions]) {
    try {
      session.assertHealthy();
    } catch (error) {
      failure ??= error;
    }
    try {
      session.dispose();
    } catch (error) {
      failure ??= error;
    }
  }
  if (failure) throw failure;
}
