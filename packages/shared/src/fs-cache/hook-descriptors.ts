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
import type { CachedStat } from './archive.js';
import { cacheMiss, requireCallback, restoreError } from './hook-core.js';
import { originalFs } from './hook-originals.js';
import {
  CACHED_FILE_HANDLE,
  readArguments,
  unsupportedFilesystemOperation,
} from './hook-patching.js';
import { restoreStat, statOperation } from './hook-snapshots.js';
import type {
  ArchiveFacade,
  ErrorCallback,
  FileDescriptorMap,
  OperationOptions,
  OperationOptionsInput,
  ReadArguments,
  ReadOptions,
  StatValue,
  ValueCallback,
} from './hook-types.js';

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
