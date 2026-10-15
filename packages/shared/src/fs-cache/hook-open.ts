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
import {
  cacheMiss,
  failure,
  missingPath,
  pathDisplay,
  requireCallback,
  restoreError,
  success,
} from './hook-core.js';
import { originalFs, originalPromises } from './hook-originals.js';
import {
  FS_PROMISES_MODULE,
  decodeFileContent,
  openOperation,
  pathLikeToString,
  readonlyFlags,
  unsupportedFilesystemOperation,
} from './hook-patching.js';
import { snapshotStat, statOperation } from './hook-snapshots.js';
import { getActiveArchive, requireActiveArchive } from './hook-state.js';
import type {
  ArchiveFacade,
  FileDescriptorMap,
  FileHandleLike,
  FileHandleTracker,
  ValueCallback,
} from './hook-types.js';

type ReplayOpenResult = { found: false } | { fd: number; found: true };

function expiredOpenError(input: fs.PathLike): NodeJS.ErrnoException {
  const error = new Error(
    'Filesystem cache analysis ended before open completed',
  ) as NodeJS.ErrnoException;
  error.code = 'ERR_SONARJS_FS_CACHE_SESSION_ENDED';
  error.path = pathLikeToString(input);
  return error;
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
      if (archive.blocksNativeRead(input)) {
        missingPath(operation, input);
      }
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
      if (archive.isPassthrough(input)) {
        const fd = originalFs.openSync(input, flags, mode);
        fileDescriptors.set(fd, { passthrough: true, position: 0, virtual: false });
        return fd;
      }
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
      fileDescriptors.set(fd, {
        key,
        passthrough: archive.isPassthrough(input),
        position: 0,
        virtual: false,
      });
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
    if (!readonlyFlags(flags) && !archive.isPassthrough(input)) {
      throw unsupportedFilesystemOperation('fs', 'open with write-capable flags');
    }
    const done = requireCallback(callback, 'fs.open');
    const openingArchive = requireActiveArchive();
    const key = openingArchive.keyFor(input);
    const passthrough = openingArchive.isPassthrough(input);
    const complete = (error: NodeJS.ErrnoException | null, fd?: number, virtual = false) => {
      if (error || getActiveArchive() === openingArchive) {
        done(error, fd);
      } else if (fd !== undefined && !virtual) {
        // The request no longer owns this open. Close the native descriptor before reporting
        // cancellation, without touching a later session's archive or descriptor tracking.
        originalFs.close(fd, closeError => done(closeError ?? expiredOpenError(input)));
      } else {
        done(expiredOpenError(input));
      }
    };
    try {
      if (readonlyFlags(flags) && (key !== undefined || openingArchive.blocksNativeRead(input))) {
        const fd = openSync(input, flags, mode);
        const virtual = fileDescriptors.get(fd)?.virtual === true;
        queueMicrotask(() => complete(null, fd, virtual));
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
      if (getActiveArchive() !== openingArchive) {
        complete(error, fd);
        return;
      }
      if (!error) {
        fileDescriptors.set(fd, {
          key,
          passthrough,
          position: 0,
          virtual: false,
        });
      }
      complete(error, fd);
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
    const openingArchive = requireActiveArchive();
    if (!readonlyFlags(flags) && !archive.isPassthrough(input)) {
      throw unsupportedFilesystemOperation(FS_PROMISES_MODULE, 'open with write-capable flags');
    }
    const operation = openOperation(flags);
    if (readonlyFlags(flags)) {
      const replayed = replayOpen(input, operation);
      if (replayed.found) {
        // Match the asynchronous native open contract before exposing a virtual descriptor.
        await Promise.resolve();
        if (getActiveArchive() !== openingArchive) {
          throw expiredOpenError(input);
        }
        return new CachedFileHandle(replayed.fd);
      }
    }
    const key = archive.keyFor(input);
    const passthrough = openingArchive.isPassthrough(input);
    try {
      const handle = await originalPromises.open(input, flags, mode);
      if (getActiveArchive() !== openingArchive) {
        await handle.close();
        throw expiredOpenError(input);
      }
      if (archive.mode === 'record' && key !== undefined && readonlyFlags(flags)) {
        archive.set(key, operation, success(null));
        captureOpenedFile(input, handle.fd);
      }
      fileHandles.add(handle, passthrough);
      return handle;
    } catch (error) {
      if (
        getActiveArchive() === openingArchive &&
        archive.mode === 'record' &&
        key !== undefined &&
        readonlyFlags(flags)
      ) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  return openPromise;
}
