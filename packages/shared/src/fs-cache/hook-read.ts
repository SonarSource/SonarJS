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
import { type CacheExecutor, cacheMiss, requireCallback, restoreError } from './hook-core.js';
import { originalFs, originalPromises } from './hook-originals.js';
import {
  CACHED_FILE_HANDLE,
  FS_PROMISES_MODULE,
  decodeFileContent,
  unsupportedFilesystemOperation,
} from './hook-patching.js';
import { returnReadBuffer, withoutEncoding } from './hook-snapshots.js';
import type {
  FileDescriptorMap,
  FileHandleLike,
  FileHandleTracker,
  OperationOptions,
  OperationOptionsInput,
  ValueCallback,
} from './hook-types.js';

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
