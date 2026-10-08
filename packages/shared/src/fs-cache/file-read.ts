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
import { type FsError, pathDisplay, restoreError } from './snapshot.js';
import {
  CACHED_FILE_HANDLE,
  type FileDescriptorMap,
  type FileHandleLike,
  type FileHandleTracker,
  type OperationOptions,
  type OperationOptionsInput,
  type ValueCallback,
} from './file-descriptors.js';

/**
 * The `fs.readFile`/`fs.readFileSync`/`fs.promises.readFile` patches used by the filesystem
 * cache hook. Extracted from hook.ts to keep that module focused on the stat/readdir patches
 * and the executor/patch-installation plumbing shared across all of them.
 */

const FS_PROMISES_MODULE = 'fs/promises';

const originalFs = {
  readFile: fs.readFile.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
};
const originalPromises = {
  readFile: fs.promises.readFile.bind(fs.promises),
};

type EncodingOption = BufferEncoding | 'buffer' | null;

export type CacheExecutor = {
  runSync<TValue, TStored = TValue>(
    input: fs.PathLike | number | FileHandleLike,
    operation: string,
    producer: () => TValue,
    encode?: (value: TValue) => TStored,
    decode?: (value: TStored) => TValue,
  ): TValue;
  runAsync<TValue, TStored = TValue>(
    input: fs.PathLike | number | FileHandleLike,
    operation: string,
    producer: () => Promise<TValue>,
    encode?: (value: TValue) => TStored,
    decode?: (value: TStored) => TValue,
  ): Promise<TValue>;
};

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
  error.code = 'ERR_SONARJS_FS_CACHE_UNSUPPORTED';
  return error;
}

function requireCallback<T>(callback: T | undefined, operation: string): T {
  if (!callback) {
    throw new TypeError(`${operation} requires a callback`);
  }
  return callback;
}

function getEncoding(options: OperationOptionsInput): EncodingOption | undefined {
  if (typeof options === 'string') {
    return options;
  }
  return options?.encoding || undefined;
}

function withoutEncoding(options: OperationOptionsInput): OperationOptions | null | undefined {
  if (typeof options === 'string') {
    return null;
  }
  return options && typeof options === 'object' ? { ...options, encoding: null } : options;
}

function returnReadBuffer(buffer: Uint8Array, options: OperationOptionsInput): Buffer | string {
  const encoding = getEncoding(options);
  return encoding && encoding !== 'buffer'
    ? Buffer.from(buffer).toString(encoding)
    : Buffer.from(buffer);
}

function decodeFileContent(value: Buffer | string): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, 'base64');
}

export function createReadFilePatches(
  executor: CacheExecutor,
  fileDescriptors: FileDescriptorMap,
  fileHandles: FileHandleTracker,
) {
  function readFileSync(
    input: fs.PathOrFileDescriptor,
    options?: OperationOptionsInput,
  ): Buffer | string {
    const tracked = typeof input === 'number' ? fileDescriptors.get(input) : undefined;
    if (typeof input === 'number' && !tracked) {
      throw unsupportedFilesystemOperation('fs', 'readFileSync with an unknown descriptor');
    }
    if (tracked?.virtual) {
      if (tracked.readError) {
        throw restoreError(tracked.readError, tracked.input);
      }
      if (!tracked.content) {
        throw cacheMiss('readFile', tracked.input);
      }
      const remaining = tracked.content.subarray(tracked.position);
      tracked.position = tracked.content.length;
      return returnReadBuffer(remaining, options);
    }
    const buffer = executor.runSync(
      input,
      'readFile',
      () =>
        (
          originalFs.readFileSync as unknown as (
            input: fs.PathOrFileDescriptor,
            options?: OperationOptions | null,
          ) => Buffer
        )(input, withoutEncoding(options)),
      value => value,
      decodeFileContent,
    );
    return returnReadBuffer(buffer, options);
  }

  async function readFilePromise(
    input: fs.PathLike | FileHandleLike,
    options?: OperationOptionsInput,
  ): Promise<Buffer | string> {
    const cachedHandle = input as FileHandleLike & {
      [CACHED_FILE_HANDLE]?: boolean;
      readFile?: (options?: OperationOptionsInput) => Promise<Buffer | string>;
    };
    if (cachedHandle[CACHED_FILE_HANDLE] && cachedHandle.readFile) {
      return cachedHandle.readFile(options);
    }
    if (typeof input === 'object' && 'fd' in input && !fileHandles.has(input)) {
      throw unsupportedFilesystemOperation(
        FS_PROMISES_MODULE,
        'readFile with an unknown FileHandle',
      );
    }
    const buffer = await executor.runAsync(
      input,
      'readFile',
      () =>
        (
          originalPromises.readFile as unknown as (
            input: fs.PathLike | FileHandleLike,
            options?: OperationOptions | null,
          ) => Promise<Buffer>
        )(input, withoutEncoding(options)),
      value => value,
      decodeFileContent,
    );
    return returnReadBuffer(buffer, options);
  }

  function readFile(
    input: fs.PathOrFileDescriptor,
    options: OperationOptionsInput | ValueCallback<Buffer | string>,
    callback?: ValueCallback<Buffer | string>,
  ): void {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const done = requireCallback(callback, 'fs.readFile');
    const tracked = typeof input === 'number' ? fileDescriptors.get(input) : undefined;
    if (typeof input === 'number' && !tracked) {
      throw unsupportedFilesystemOperation('fs', 'readFile with an unknown descriptor');
    }
    if (typeof input === 'number' && tracked && !tracked.virtual) {
      (
        originalFs.readFile as unknown as (
          input: fs.PathOrFileDescriptor,
          options: OperationOptionsInput,
          callback: ValueCallback<Buffer | string>,
        ) => void
      )(input, options, done);
    } else {
      const result = tracked?.virtual
        ? Promise.resolve().then(() => readFileSync(input, options))
        : readFilePromise(input as fs.PathLike, options);
      result.then(
        value => done(null, value),
        error => done(error),
      );
    }
  }

  return { readFile, readFilePromise, readFileSync };
}
