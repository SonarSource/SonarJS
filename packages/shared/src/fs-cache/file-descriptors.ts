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
import type { CachedStat, FsCacheErrorSnapshot, FsCacheOutcome } from './archive.js';
import {
  type ArchiveDecodePortablePath,
  type ArchiveEncodePortablePath,
  type FsError,
  pathDisplay,
  restoreError,
  restoreStat,
  type StatValue,
} from './snapshot.js';

/**
 * Virtual file-descriptor emulation and the `fs.read`/`fs.readSync`/`fs.fstat`/`fs.fstatSync`/
 * `fs.close`/`fs.closeSync` patches for descriptors that are already open. The `fs.open`/
 * `fs.openSync`/`fs.promises.open` patches that create those descriptors live in
 * file-open.ts; both modules were extracted from hook.ts to keep that module focused on the
 * simpler stat/readdir/readFile patches.
 */

const originalFs = {
  close: fs.close.bind(fs),
  closeSync: fs.closeSync.bind(fs),
  fstat: fs.fstat.bind(fs),
  fstatSync: fs.fstatSync.bind(fs),
  read: fs.read.bind(fs),
  readSync: fs.readSync.bind(fs),
};

type EncodingOption = BufferEncoding | 'buffer' | null;
export type OperationOptions = {
  encoding?: EncodingOption;
  withFileTypes?: boolean;
  recursive?: boolean;
  bigint?: boolean;
  throwIfNoEntry?: boolean;
};
export type OperationOptionsInput = OperationOptions | BufferEncoding | 'buffer' | null | undefined;
type ReadOptions = OperationOptions & {
  buffer?: NodeJS.ArrayBufferView;
  offset?: number;
  length?: number;
  position?: number | bigint | null;
};
type ReadArguments =
  [ReadOptions] | [offset?: number, length?: number, position?: number | bigint | null];
export type ErrorCallback = (error: NodeJS.ErrnoException | null) => void;
export type ValueCallback<T> = (error: NodeJS.ErrnoException | null, value?: T) => void;
export type FileHandleLike = { fd: number };
export type FileHandleTracker = {
  add(value: object): void;
  clear(): void;
  has(value: object): boolean;
};
type TrackedDescriptor =
  | { key?: string; position: number; virtual: false }
  | {
      content?: Buffer;
      input: string;
      key: string;
      position: number;
      readError?: FsCacheErrorSnapshot;
      virtual: true;
    };
export type FileDescriptorMap = Map<number, TrackedDescriptor>;
export type ArchiveFacade = ArchiveDecodePortablePath &
  ArchiveEncodePortablePath & {
    readonly mode: 'record' | 'replay' | undefined;
    keyFor(input: fs.PathLike): string | undefined;
    get<T>(key: string, operation: string): FsCacheOutcome<T> | undefined;
    getExists(key: string, operation?: string): boolean | undefined;
    set<T>(key: string, operation: string, outcome: FsCacheOutcome<T>): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
  };

export const CACHED_FILE_HANDLE = Symbol('cached filesystem file handle');

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

function readArguments(buffer: NodeJS.ArrayBufferView, args: ReadArguments) {
  if (args[0] && typeof args[0] === 'object') {
    const offset = args[0].offset ?? 0;
    return {
      offset,
      length: args[0].length ?? buffer.byteLength - offset,
      position: args[0].position ?? null,
    };
  }
  const offset = args[0] ?? 0;
  return {
    offset,
    length: args[1] ?? buffer.byteLength - offset,
    position: args[2] ?? null,
  };
}

export function createDescriptorPatches(
  archive: ArchiveFacade,
  fileDescriptors: FileDescriptorMap,
  readFileSync: (
    input: fs.PathOrFileDescriptor,
    options?: OperationOptionsInput,
  ) => Buffer | string,
) {
  function readVirtual(
    fd: number,
    buffer: NodeJS.ArrayBufferView,
    args: ReadArguments,
  ): number | undefined {
    const tracked = fileDescriptors.get(fd);
    if (!tracked?.virtual) {
      return undefined;
    }
    if (tracked.readError) {
      throw restoreError(tracked.readError, tracked.input);
    }
    if (!tracked.content) {
      throw cacheMiss('readFile', tracked.input);
    }
    const { offset, length, position } = readArguments(buffer, args);
    const sequential = position === null || position === undefined;
    const requestedStart = Number(sequential ? tracked.position : position);
    const content = tracked.content;
    const start = Math.max(0, Math.min(content.length, requestedStart));
    const end = Math.min(content.length, start + Number(length));
    const target = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const bytesRead = content.copy(target, offset, start, Math.max(start, end));
    if (sequential) {
      tracked.position = start + bytesRead;
    }
    return bytesRead;
  }

  function readSync(fd: number, buffer: NodeJS.ArrayBufferView, ...args: ReadArguments): number {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'readSync with an unknown descriptor');
    }
    return (
      readVirtual(fd, buffer, args) ??
      (
        originalFs.readSync as unknown as (
          fd: number,
          buffer: NodeJS.ArrayBufferView,
          ...args: ReadArguments
        ) => number
      )(fd, buffer, ...args)
    );
  }

  function read(fd: number, ...args: unknown[]): void {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'read with an unknown descriptor');
    }
    if (!tracked.virtual) {
      (originalFs.read as unknown as (fd: number, ...args: unknown[]) => void)(fd, ...args);
    } else {
      const callback = args.pop() as (
        error: NodeJS.ErrnoException | null,
        bytesRead: number,
        buffer: NodeJS.ArrayBufferView,
      ) => void;
      let buffer: NodeJS.ArrayBufferView;
      let readArgs: ReadArguments;
      if (ArrayBuffer.isView(args[0])) {
        buffer = args[0] as NodeJS.ArrayBufferView;
        readArgs = args.slice(1) as ReadArguments;
      } else {
        const options = (args[0] || {}) as ReadOptions;
        buffer = options.buffer || Buffer.alloc(16_384);
        readArgs = [options];
      }
      try {
        const bytesRead = readVirtual(fd, buffer, readArgs);
        queueMicrotask(() => callback(null, bytesRead ?? 0, buffer));
      } catch (error) {
        queueMicrotask(() => callback(error as NodeJS.ErrnoException, 0, buffer));
      }
    }
  }

  function fstatSync(fd: number, options?: OperationOptions): StatValue {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'fstatSync with an unknown descriptor');
    }
    if (!tracked.virtual) {
      return originalFs.fstatSync(fd, options);
    }
    const outcome = archive.get<CachedStat>(tracked.key, statOperation('fstat', options));
    if (!outcome?.ok) {
      throw cacheMiss('fstat', tracked.key);
    }
    return restoreStat(outcome.value, options?.bigint);
  }

  function fstat(
    fd: number,
    options: OperationOptions | ValueCallback<StatValue> | undefined,
    callback?: ValueCallback<StatValue>,
  ): void {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const done = requireCallback(callback, 'fs.fstat');
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'fstat with an unknown descriptor');
    }
    if (tracked?.virtual) {
      try {
        const stat = fstatSync(fd, options);
        queueMicrotask(() => done(null, stat));
      } catch (error) {
        queueMicrotask(() => done(error as NodeJS.ErrnoException));
      }
      return;
    }
    (
      originalFs.fstat as unknown as (
        fd: number,
        options: OperationOptions | undefined,
        callback: ValueCallback<StatValue>,
      ) => void
    )(fd, options, done);
  }

  function closeSync(fd: number): void {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'closeSync with an unknown descriptor');
    }
    fileDescriptors.delete(fd);
    if (!tracked?.virtual) {
      originalFs.closeSync(fd);
    }
  }

  function close(fd: number, callback?: ErrorCallback): void {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'close with an unknown descriptor');
    }
    fileDescriptors.delete(fd);
    if (tracked?.virtual) {
      if (callback) {
        queueMicrotask(() => callback(null));
      }
    } else {
      originalFs.close(fd, callback);
    }
  }

  class CachedFileHandle {
    fd: number;
    [CACHED_FILE_HANDLE]: boolean;

    constructor(fd: number) {
      this.fd = fd;
      this[CACHED_FILE_HANDLE] = true;
    }

    read(
      buffer?: NodeJS.ArrayBufferView | ReadOptions,
      ...args: ReadArguments
    ): Promise<{ bytesRead: number | undefined; buffer: NodeJS.ArrayBufferView }> {
      if (!ArrayBuffer.isView(buffer)) {
        const options = (buffer ?? {}) as ReadOptions;
        const target = options.buffer ?? Buffer.alloc(16_384);
        return Promise.resolve().then(() => ({
          bytesRead: readVirtual(this.fd, target, [options]),
          buffer: target,
        }));
      }
      return Promise.resolve().then(() => ({
        bytesRead: readVirtual(this.fd, buffer, args),
        buffer,
      }));
    }

    readFile(options?: OperationOptionsInput) {
      return Promise.resolve().then(() => readFileSync(this.fd, options));
    }

    stat(options?: OperationOptions) {
      return Promise.resolve().then(() => fstatSync(this.fd, options));
    }

    close() {
      return Promise.resolve().then(() => closeSync(this.fd));
    }

    async [Symbol.asyncDispose]() {
      await this.close();
    }
  }

  return {
    CachedFileHandle,
    close,
    closeSync,
    fstat,
    fstatSync,
    read,
    readSync,
  };
}
