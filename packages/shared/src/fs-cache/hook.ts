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
import { syncBuiltinESMExports } from 'node:module';
import {
  type ArchiveOptions,
  type FsCacheOutcome,
  FsCacheArchive,
  type PortablePath,
  type RealpathOperation,
} from './archive.js';
import { createDirectoryPatches } from './hook-directory.js';
import { createBasicPatches } from './hook-basic.js';
import { createDescriptorPatches } from './hook-descriptors.js';
import { createOpenPatches, createOpenPromise } from './hook-open.js';
import { createReadFilePatches } from './hook-read.js';
import { getActiveArchive, requireActiveArchive, setActiveArchive } from './hook-state.js';
import { originalFs } from './hook-originals.js';
import {
  FS_NON_OPERATION_EXPORTS,
  FS_PROMISES_MODULE,
  guardUnhandledFilesystemOperations,
  isPassthroughDescriptor,
  isPassthroughFilesystemOperation,
  patch,
  unsupportedFilesystemOperation,
} from './hook-patching.js';
import { createExecutor, makeCallback } from './hook-core.js';
import type {
  ArchiveFacade,
  Callable,
  FileDescriptorMap,
  FileHandleTracker,
} from './hook-types.js';

export const FS_CACHE_INSTALLATION = Symbol.for('sonarjs.filesystemCache.installation');

/**
 * Preserve analyzer-provided source content that bypasses the patched filesystem APIs.
 * The scanner supplies decoded text, which is stored as UTF-8 regardless of its original encoding.
 * Files read through the filesystem hooks retain their original bytes instead.
 */
export function captureProvidedFile(fileName: string, content: string): void {
  const active = getActiveArchive();
  if (active?.mode !== 'record') {
    return;
  }
  const key = active.keyFor(fileName);
  if (key !== undefined) {
    const existing = active.get<Buffer>(key, 'readFile');
    if (existing?.ok && existing.value.toString('utf8') === content) {
      return;
    }
    active.set(key, 'readFile', { ok: true, value: Buffer.from(content, 'utf8') });
  }
}

/** A recorded read proves the file existed even when no stat call was observed. */
export function hasArchivedFileContent(fileName: string): boolean {
  const active = getActiveArchive();
  if (active?.mode !== 'replay') {
    return false;
  }
  const key = active.keyFor(fileName);
  return key !== undefined && active.get(key, 'readFile')?.ok === true;
}

export type FsCacheSession = { end(): void; mode?: FsCacheArchive['mode'] };
/** Filesystem capability, not product identity: absent without an active replay filesystem. */
export function getFileSystemCaseSensitivity(): boolean | undefined {
  const active = getActiveArchive();
  return active?.mode === 'replay' ? active.caseSensitivePaths : undefined;
}
export type FsCacheInstallation = {
  beginAnalysis(options: ArchiveOptions): FsCacheSession;
  getStatistics(): { hits: number; misses: number; paths: number };
};
const installations = globalThis as typeof globalThis & {
  [FS_CACHE_INSTALLATION]?: FsCacheInstallation;
};

const activeArchiveFacade: ArchiveFacade = {
  get mode() {
    return getActiveArchive()?.mode;
  },
  keyFor(input: fs.PathLike) {
    return getActiveArchive()?.keyFor(input);
  },
  get<T = unknown>(key: string, operation: string) {
    return requireActiveArchive().get<T>(key, operation);
  },
  getExists(key: string, operation?: string) {
    return requireActiveArchive().getExists(key, operation);
  },
  isPassthrough(input: fs.PathLike) {
    return requireActiveArchive().isPassthrough(input);
  },
  blocksNativeRead(input: fs.PathLike) {
    return requireActiveArchive().blocksNativeRead(input);
  },
  set<T>(key: string, operation: string, outcome: FsCacheOutcome<T>) {
    return requireActiveArchive().set(key, operation, outcome);
  },
  encodePortablePath(filePath: fs.PathLike) {
    return requireActiveArchive().encodePortablePath(filePath);
  },
  decodePortablePath(filePath: PortablePath, operation?: RealpathOperation) {
    return requireActiveArchive().decodePortablePath(filePath, operation);
  },
  recordCacheHit() {
    return requireActiveArchive().recordCacheHit();
  },
  recordCacheMiss() {
    return requireActiveArchive().recordCacheMiss();
  },
};

function installPatches(archive: ArchiveFacade) {
  const executor = createExecutor(archive);
  const patchedProperties = new Set<PropertyKey>();
  const patchedPromiseProperties = new Set<PropertyKey>();
  const fileDescriptors: FileDescriptorMap = new Map();
  const fileHandles: FileHandleTracker & {
    passthroughValues: WeakSet<object>;
    values: WeakSet<object>;
  } = {
    passthroughValues: new WeakSet<object>(),
    values: new WeakSet<object>(),
    add(value: object, passthrough: boolean) {
      this.values.add(value);
      if (passthrough) {
        this.passthroughValues.add(value);
      }
    },
    clear() {
      this.values = new WeakSet<object>();
      this.passthroughValues = new WeakSet<object>();
    },
    has(value: object) {
      return this.values.has(value);
    },
    isPassthrough(value: object) {
      return this.passthroughValues.has(value);
    },
  };
  const readFile = createReadFilePatches(executor, fileDescriptors, fileHandles);
  const basic = createBasicPatches(archive, executor);
  const directory = createDirectoryPatches(archive, executor);
  const openPatches = createOpenPatches(archive, fileDescriptors);
  const descriptor = createDescriptorPatches(archive, fileDescriptors, readFile.readFileSync);
  const openPromise = createOpenPromise(
    archive,
    fileHandles,
    openPatches,
    descriptor.CachedFileHandle,
  );

  patch(fs, patchedProperties, 'readFileSync', readFile.readFileSync);
  patch(fs, patchedProperties, 'readFile', readFile.readFile);
  patch(fs, patchedProperties, 'readdirSync', basic.readdirSync);
  patch(fs, patchedProperties, 'readdir', basic.readdir);
  patch(fs, patchedProperties, 'existsSync', basic.existsSync);
  patch(fs, patchedProperties, 'exists', basic.exists, selected => {
    return ((input: fs.PathLike) =>
      new Promise<boolean>(resolve => {
        Reflect.apply(selected, fs, [input, resolve]);
      })) as Callable;
  });
  patch(fs, patchedProperties, 'accessSync', basic.accessSync);
  patch(fs, patchedProperties, 'access', basic.access);
  patch(fs, patchedProperties, 'statSync', basic.statSync);
  patch(fs, patchedProperties, 'stat', makeCallback(basic.statPromise));
  patch(fs, patchedProperties, 'lstatSync', basic.lstatSync);
  patch(fs, patchedProperties, 'lstat', makeCallback(basic.lstatPromise));
  patch(fs, patchedProperties, 'realpathSync', basic.realpathSync);
  patch(fs, patchedProperties, 'realpath', basic.realpath);
  patch(fs, patchedProperties, 'readlinkSync', basic.readlinkSync);
  patch(fs, patchedProperties, 'readlink', makeCallback(basic.readlinkPromise));
  patch(fs, patchedProperties, 'opendirSync', directory.opendirSync);
  patch(fs, patchedProperties, 'opendir', directory.opendir);
  patch(fs, patchedProperties, 'openSync', openPatches.openSync);
  patch(fs, patchedProperties, 'open', openPatches.open);
  patch(fs, patchedProperties, 'readSync', descriptor.readSync);
  patch(fs, patchedProperties, 'read', descriptor.read);
  patch(fs, patchedProperties, 'fstatSync', descriptor.fstatSync);
  patch(fs, patchedProperties, 'fstat', descriptor.fstat);
  patch(fs, patchedProperties, 'closeSync', descriptor.closeSync);
  patch(fs, patchedProperties, 'close', descriptor.close);
  // Node stdout and stderr use this primitive. Limit the native pass-through to their standard
  // descriptors and descriptors opened below a native passthrough tree.
  patch(fs, patchedProperties, 'writeSync', (fd: number, ...args: unknown[]) => {
    if (fd !== 1 && fd !== 2 && !isPassthroughDescriptor(fileDescriptors, fd)) {
      throw unsupportedFilesystemOperation('fs', 'writeSync outside stdout or stderr');
    }
    return (originalFs.writeSync as unknown as (fd: number, ...args: unknown[]) => number)(
      fd,
      ...args,
    );
  });

  patch(fs.promises, patchedPromiseProperties, 'readFile', readFile.readFilePromise);
  patch(fs.promises, patchedPromiseProperties, 'readdir', basic.readdirPromise);
  patch(fs.promises, patchedPromiseProperties, 'access', basic.accessPromise);
  patch(fs.promises, patchedPromiseProperties, 'stat', basic.statPromise);
  patch(fs.promises, patchedPromiseProperties, 'lstat', basic.lstatPromise);
  patch(fs.promises, patchedPromiseProperties, 'realpath', basic.realpathPromise);
  patch(fs.promises, patchedPromiseProperties, 'readlink', basic.readlinkPromise);
  patch(fs.promises, patchedPromiseProperties, 'opendir', directory.opendirPromise);
  patch(fs.promises, patchedPromiseProperties, 'open', openPromise);

  const canPassthrough = (name: string, args: unknown[]) =>
    isPassthroughFilesystemOperation(archive, fileDescriptors, fileHandles, name, args);
  guardUnhandledFilesystemOperations(
    fs,
    patchedProperties,
    FS_NON_OPERATION_EXPORTS,
    'fs',
    canPassthrough,
  );
  guardUnhandledFilesystemOperations(
    fs.promises,
    patchedPromiseProperties,
    new Set(),
    FS_PROMISES_MODULE,
    canPassthrough,
    true,
  );

  syncBuiltinESMExports();

  const reset = () => {
    fileDescriptors.clear();
    fileHandles.clear();
  };
  return { reset };
}

export function installFsCache(): FsCacheInstallation {
  const existingInstallation = installations[FS_CACHE_INSTALLATION];
  if (existingInstallation) {
    return existingInstallation;
  }

  const patches = installPatches(activeArchiveFacade);
  const reportFlushFailure = (archive: FsCacheArchive, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Filesystem cache warning: Cannot write filesystem cache archive ${archive.archivePath}: ${message}\n`,
    );
  };
  const exitListener = () => {
    const active = getActiveArchive();
    if (!active) {
      return;
    }
    try {
      active.flush();
    } catch (error: unknown) {
      reportFlushFailure(active, error);
    }
  };
  process.once('exit', exitListener);

  const installation: FsCacheInstallation = {
    beginAnalysis(analysisOptions: ArchiveOptions) {
      if (getActiveArchive()) {
        throw new Error('A filesystem cache analysis is already active');
      }
      const archive = new FsCacheArchive(analysisOptions);
      if (archive.mode === 'replay') {
        archive.load();
      }
      setActiveArchive(archive);
      let ended = false;
      return {
        mode: archive.mode,
        end() {
          if (ended) {
            return;
          }
          if (getActiveArchive() !== archive) {
            throw new Error('The active filesystem cache analysis changed unexpectedly');
          }
          try {
            try {
              archive.flush();
            } catch (error: unknown) {
              reportFlushFailure(archive, error);
            }
          } finally {
            patches.reset();
            setActiveArchive(undefined);
            ended = true;
          }
        },
      };
    },
    getStatistics: () => requireActiveArchive().getStatistics(),
  };
  installations[FS_CACHE_INSTALLATION] = installation;
  return installation;
}
