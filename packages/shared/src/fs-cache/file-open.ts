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
import type { FsCacheOutcome } from './archive.js';
import {
  type FsError,
  pathDisplay,
  restoreError,
  snapshotError,
  snapshotStat,
} from './snapshot.js';
import {
  type ArchiveFacade,
  type FileDescriptorMap,
  type FileHandleLike,
  type FileHandleTracker,
  type ValueCallback,
} from './file-descriptors.js';

/**
 * The `fs.open`/`fs.openSync`/`fs.promises.open` patches used by the filesystem cache hook.
 * Extracted from file-descriptors.ts to keep that module focused on the already-open
 * descriptor operations (read/fstat/close).
 */

const originalFs = {
  fstatSync: fs.fstatSync.bind(fs),
  open: fs.open.bind(fs),
  openSync: fs.openSync.bind(fs),
  readSync: fs.readSync.bind(fs),
};
const originalPromises = {
  open: fs.promises.open.bind(fs.promises),
};

type ReplayOpenResult = { found: false } | { fd: number; found: true };

function success<T>(value: T): FsCacheOutcome<T> {
  return { ok: true, value };
}

function failure(error: unknown): FsCacheOutcome<never> {
  return { ok: false, error: snapshotError(error) };
}

function cacheMiss(operation: string, input: fs.PathLike | number): FsError {
  const error = new Error(
    `Filesystem cache has no ${operation} observation for '${pathDisplay(input)}'`,
  ) as FsError;
  error.name = 'FsCacheMissError';
  error.code = 'ERR_SONARJS_FS_CACHE_MISS';
  error.path = pathDisplay(input);
  error.syscall = operation.split(':', 1)[0];
  return error;
}

function missingPath(operation: string, input: fs.PathLike | number): false | undefined | never {
  if (operation === 'exists') {
    return false;
  }
  if (
    (operation.startsWith('stat:') || operation.startsWith('lstat:')) &&
    operation.endsWith(':soft')
  ) {
    return undefined;
  }
  const currentPath = pathDisplay(input);
  const name = operation.split(':', 1)[0];
  const syscall =
    {
      readFile: 'open',
      readdir: 'scandir',
      realpath: 'lstat',
      'realpath.native': 'realpath',
    }[name] || name;
  const error = new Error(
    `ENOENT: no such file or directory, ${syscall} '${currentPath}'`,
  ) as FsError;
  error.code = 'ENOENT';
  error.errno = -2;
  error.path = currentPath;
  error.syscall = syscall;
  throw error;
}

function unsupportedFilesystemOperation(moduleName: string, name: PropertyKey): FsError {
  const error = new Error(
    `Filesystem cache does not support ${moduleName}.${String(name)} from Node ${process.version}`,
  ) as FsError;
  error.name = 'UnsupportedFsOperationError';
  error.code = 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION';
  return error;
}

function requireCallback<T>(callback: T | undefined, operation: string): T {
  if (!callback) {
    throw new TypeError(`${operation} requires a callback`);
  }
  return callback;
}

function statOperation(
  name: string,
  options: { bigint?: boolean; throwIfNoEntry?: boolean } = {},
): string {
  const result = options?.throwIfNoEntry === false ? 'soft' : 'throw';
  return `${name}:${options?.bigint ? 'bigint' : 'number'}:${result}`;
}

function readonlyFlags(flags: fs.OpenMode | undefined): boolean {
  if (flags === undefined) {
    return true;
  }
  if (typeof flags === 'string') {
    return flags === 'r' || flags === 'rs' || flags === 'sr';
  }
  return (
    (flags &
      (fs.constants.O_WRONLY |
        fs.constants.O_RDWR |
        fs.constants.O_CREAT |
        fs.constants.O_APPEND |
        fs.constants.O_TRUNC)) ===
    0
  );
}

function openOperation(flags: fs.OpenMode | undefined): string {
  if (flags === undefined || flags === 'r' || flags === fs.constants.O_RDONLY) {
    return 'open:r';
  }
  return `open:${String(flags)}`;
}

function decodeFileContent(value: Buffer | string): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, 'base64');
}

function readDescriptorContent(fd: number): Buffer {
  const chunks: Buffer[] = [];
  let position = 0;
  let bytesRead;
  do {
    const chunk = Buffer.allocUnsafe(64 * 1024);
    bytesRead = originalFs.readSync(fd, chunk, 0, chunk.length, position);
    if (bytesRead > 0) {
      chunks.push(chunk.subarray(0, bytesRead));
      position += bytesRead;
    }
  } while (bytesRead > 0);
  return Buffer.concat(chunks);
}

export function createOpenPatches(archive: ArchiveFacade, fileDescriptors: FileDescriptorMap) {
  let nextFileDescriptor = 0x3fffffff;

  function captureOpenedFile(input: fs.PathLike, fd: number): void {
    const key = archive.keyFor(input);
    if (key === undefined || archive.mode !== 'record') {
      return;
    }
    if (archive.get(key, 'readFile') === undefined) {
      try {
        archive.set(key, 'readFile', success(readDescriptorContent(fd)));
      } catch (error) {
        archive.set(key, 'readFile', failure(error));
      }
    }
    try {
      const numberOperation = statOperation('fstat');
      if (archive.get(key, numberOperation) === undefined) {
        archive.set(key, numberOperation, success(snapshotStat(originalFs.fstatSync(fd))));
      }
      const bigintOperation = statOperation('fstat', { bigint: true });
      if (archive.get(key, bigintOperation) === undefined) {
        archive.set(
          key,
          bigintOperation,
          success(snapshotStat(originalFs.fstatSync(fd, { bigint: true }))),
        );
      }
    } catch {
      // The original open already succeeded; auxiliary capture must not alter its result.
    }
  }

  function replayOpen(input: fs.PathLike, operation: string): ReplayOpenResult {
    const key = archive.keyFor(input);
    if (key === undefined) {
      return { found: false };
    }
    const outcome = archive.get(key, operation);
    if (outcome === undefined) {
      if (archive.getExists(key, operation) === false) {
        archive.recordCacheHit();
        missingPath(operation, input);
      }
      archive.recordCacheMiss();
      if (archive.mode === 'replay') {
        throw cacheMiss(operation, input);
      }
      return { found: false };
    }
    archive.recordCacheHit();
    if (!outcome.ok) {
      throw restoreError(outcome.error, input);
    }
    const file = archive.get<Buffer | string>(key, 'readFile');
    if (file === undefined) {
      if (archive.mode === 'replay') {
        throw cacheMiss('readFile', input);
      }
      return { found: false };
    }
    const fd = nextFileDescriptor;
    nextFileDescriptor -= 1;
    fileDescriptors.set(fd, {
      content: file.ok ? decodeFileContent(file.value) : undefined,
      input: pathDisplay(input),
      key,
      position: 0,
      readError: file.ok ? undefined : file.error,
      virtual: true,
    });
    return { fd, found: true };
  }

  function openSync(input: fs.PathLike, flags: fs.OpenMode = 'r', mode?: fs.Mode): number {
    if (!readonlyFlags(flags)) {
      throw unsupportedFilesystemOperation('fs', 'openSync with write-capable flags');
    }
    const operation = openOperation(flags);
    const key = archive.keyFor(input);
    const replayed = replayOpen(input, operation);
    if (replayed.found) {
      return replayed.fd;
    }

    try {
      const fd = originalFs.openSync(input, flags, mode);
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, success(null));
        captureOpenedFile(input, fd);
      }
      fileDescriptors.set(fd, { key, position: 0, virtual: false });
      return fd;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  function open(
    input: fs.PathLike,
    flags: fs.OpenMode | ValueCallback<number>,
    mode?: fs.Mode | ValueCallback<number>,
    callback?: ValueCallback<number>,
  ): void {
    if (typeof flags === 'function') {
      callback = flags;
      flags = 'r';
      mode = undefined;
    } else if (typeof mode === 'function') {
      callback = mode;
      mode = undefined;
    }
    if (!readonlyFlags(flags)) {
      throw unsupportedFilesystemOperation('fs', 'open with write-capable flags');
    }
    const done = requireCallback(callback, 'fs.open');
    try {
      const key = archive.keyFor(input);
      if (readonlyFlags(flags) && key !== undefined) {
        const fd = openSync(input, flags, mode);
        queueMicrotask(() => done(null, fd));
        return;
      }
    } catch (error) {
      queueMicrotask(() => done(error as NodeJS.ErrnoException));
      return;
    }

    (
      originalFs.open as unknown as (
        input: fs.PathLike,
        flags: fs.OpenMode,
        mode: fs.Mode | undefined,
        callback: (error: NodeJS.ErrnoException | null, fd: number) => void,
      ) => void
    )(input, flags, mode, (error, fd) => {
      const key = archive.keyFor(input);
      if (archive.mode === 'record' && key !== undefined && readonlyFlags(flags)) {
        const operation = openOperation(flags);
        archive.set(key, operation, error ? failure(error) : success(null));
        if (!error) {
          captureOpenedFile(input, fd);
        }
      }
      if (!error) {
        fileDescriptors.set(fd, { key, position: 0, virtual: false });
      }
      done(error, fd);
    });
  }

  return { captureOpenedFile, open, openSync, replayOpen };
}

export function createOpenPromise(
  archive: ArchiveFacade,
  fileHandles: FileHandleTracker,
  openPatches: ReturnType<typeof createOpenPatches>,
  CachedFileHandle: new (fd: number) => FileHandleLike,
) {
  const { captureOpenedFile, replayOpen } = openPatches;

  async function openPromise(
    input: fs.PathLike,
    flags: fs.OpenMode = 'r',
    mode?: fs.Mode,
  ): Promise<FileHandleLike> {
    if (!readonlyFlags(flags)) {
      throw unsupportedFilesystemOperation('fs/promises', 'open with write-capable flags');
    }
    const operation = openOperation(flags);
    if (readonlyFlags(flags)) {
      const replayed = replayOpen(input, operation);
      if (replayed.found) {
        return new CachedFileHandle(replayed.fd);
      }
    }
    const key = archive.keyFor(input);
    try {
      const handle = await originalPromises.open(input, flags, mode);
      if (archive.mode === 'record' && key !== undefined && readonlyFlags(flags)) {
        archive.set(key, operation, success(null));
        captureOpenedFile(input, handle.fd);
      }
      fileHandles.add(handle);
      return handle;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined && readonlyFlags(flags)) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  return openPromise;
}
