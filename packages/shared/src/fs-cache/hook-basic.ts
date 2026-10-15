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
import type { CachedDirectoryEntry, CachedStat, RealpathOperation } from './archive.js';
import { type CacheExecutor, makeCallback, pathOperation, requireCallback } from './hook-core.js';
import { originalFs, originalPromises } from './hook-originals.js';
import { realpathAsPromise } from './hook-patching.js';
import {
  readdirOperation,
  restoreDirectoryResult,
  restoreName,
  restorePathResult,
  restoreStat,
  returnPathBuffer,
  snapshotDirectoryResult,
  snapshotName,
  snapshotPathResult,
  snapshotStat,
  statOperation,
  withBufferEncoding,
} from './hook-snapshots.js';
import type {
  ArchiveFacade,
  BufferedRealpath,
  CachedDirectoryValue,
  CachedPathResult,
  DirectoryValue,
  ErrorCallback,
  FunctionWithNative,
  OperationOptions,
  OperationOptionsInput,
  StatValue,
  ValueCallback,
} from './hook-types.js';

const REALPATH_NATIVE_OPERATION = 'realpath.native';

export function createBasicPatches(archive: ArchiveFacade, executor: CacheExecutor) {
  function makeStatSync(
    name: string,
    original: (input: fs.PathLike, options?: OperationOptions) => StatValue | undefined,
  ) {
    return (input: fs.PathLike, options?: OperationOptions) =>
      executor.runSync(
        input,
        statOperation(name, options),
        () => original(input, options),
        (value: StatValue | undefined) => (value === undefined ? null : snapshotStat(value)),
        (value: CachedStat | null) =>
          value === null ? undefined : restoreStat(value, options?.bigint),
      );
  }

  function makeStatPromise(
    name: string,
    original: (input: fs.PathLike, options?: OperationOptions) => Promise<StatValue>,
  ) {
    return (input: fs.PathLike, options?: OperationOptions) =>
      executor.runAsync(
        input,
        statOperation(name, options),
        () => original(input, options),
        snapshotStat,
        (value: CachedStat) => restoreStat(value, options?.bigint),
      );
  }

  function existsSync(input: fs.PathLike): boolean {
    return executor.runSync(input, 'exists', () => originalFs.existsSync(input));
  }

  function exists(input: fs.PathLike, callback: (exists: boolean) => void): void {
    let result;
    try {
      result = existsSync(input);
    } catch {
      result = false;
    }
    queueMicrotask(() => callback(result));
  }

  function accessPromise(input: fs.PathLike, mode = fs.constants.F_OK): Promise<void> {
    return executor.runAsync(input, `access:${mode}`, () => originalPromises.access(input, mode));
  }

  function access(
    input: fs.PathLike,
    mode: number | ErrorCallback,
    callback?: ErrorCallback,
  ): void {
    if (typeof mode === 'function') {
      callback = mode;
      mode = fs.constants.F_OK;
    }
    const done = requireCallback(callback, 'fs.access');
    accessPromise(input, mode).then(
      () => done(null),
      error => done(error),
    );
  }

  function accessSync(input: fs.PathLike, mode = fs.constants.F_OK): void {
    return executor.runSync(input, `access:${mode}`, () => originalFs.accessSync(input, mode));
  }

  function makeRealpathSync(
    name: RealpathOperation,
    original: (input: fs.PathLike, options: OperationOptions | 'buffer') => Buffer,
  ) {
    return (input: fs.PathLike, options?: OperationOptionsInput) => {
      const value = executor.runSync(
        input,
        pathOperation(name, options),
        () => original(input, withBufferEncoding(options)),
        (value: Buffer) => snapshotPathResult(value, archive),
        (value: CachedPathResult) => restorePathResult(value, archive, name),
      );
      return returnPathBuffer(value, options);
    };
  }

  function makeRealpathPromise(
    name: RealpathOperation,
    original: (input: fs.PathLike, options: OperationOptions | 'buffer') => Promise<Buffer>,
  ) {
    return async (input: fs.PathLike, options?: OperationOptionsInput) => {
      const value = await executor.runAsync(
        input,
        pathOperation(name, options),
        () => original(input, withBufferEncoding(options)),
        (value: Buffer) => snapshotPathResult(value, archive),
        (value: CachedPathResult) => restorePathResult(value, archive, name),
      );
      return returnPathBuffer(value, options);
    };
  }

  function readlinkSync(input: fs.PathLike, options?: OperationOptionsInput) {
    return executor.runSync(
      input,
      pathOperation('readlink', options),
      () =>
        (
          originalFs.readlinkSync as unknown as (
            input: fs.PathLike,
            options?: OperationOptionsInput,
          ) => string | Buffer
        )(input, options),
      snapshotName,
      restoreName,
    );
  }

  function readlinkPromise(input: fs.PathLike, options?: OperationOptionsInput) {
    return executor.runAsync(
      input,
      pathOperation('readlink', options),
      () =>
        (
          originalPromises.readlink as unknown as (
            input: fs.PathLike,
            options?: OperationOptionsInput,
          ) => Promise<string | Buffer>
        )(input, options),
      snapshotName,
      restoreName,
    );
  }

  const statSync = makeStatSync(
    'stat',
    originalFs.statSync as unknown as Parameters<typeof makeStatSync>[1],
  );
  const lstatSync = makeStatSync(
    'lstat',
    originalFs.lstatSync as unknown as Parameters<typeof makeStatSync>[1],
  );
  const statPromise = makeStatPromise(
    'stat',
    originalPromises.stat as unknown as Parameters<typeof makeStatPromise>[1],
  );
  const lstatPromise = makeStatPromise(
    'lstat',
    originalPromises.lstat as unknown as Parameters<typeof makeStatPromise>[1],
  );
  const realpathSync = makeRealpathSync(
    'realpath',
    originalFs.realpathSync as unknown as Parameters<typeof makeRealpathSync>[1],
  ) as FunctionWithNative;
  realpathSync.native = makeRealpathSync(
    REALPATH_NATIVE_OPERATION,
    originalFs.realpathSyncNative as unknown as Parameters<typeof makeRealpathSync>[1],
  );
  const realpathPromise = makeRealpathPromise(
    REALPATH_NATIVE_OPERATION,
    originalPromises.realpath as unknown as Parameters<typeof makeRealpathPromise>[1],
  );
  const realpath = makeCallback(
    makeRealpathPromise('realpath', (input, options) =>
      realpathAsPromise(
        originalFs.realpath as unknown as BufferedRealpath,
        input,
        options,
        'fs.realpath',
      ),
    ),
  ) as FunctionWithNative;
  realpath.native = makeCallback(
    makeRealpathPromise(REALPATH_NATIVE_OPERATION, (input, options) =>
      realpathAsPromise(
        originalFs.realpathNative as unknown as BufferedRealpath,
        input,
        options,
        'fs.realpath.native',
      ),
    ),
  );

  const readdir = createReaddirPatches(archive, executor);

  return {
    access,
    accessPromise,
    accessSync,
    exists,
    existsSync,
    lstatPromise,
    lstatSync,
    ...readdir,
    readlinkPromise,
    readlinkSync,
    realpath,
    realpathPromise,
    realpathSync,
    statPromise,
    statSync,
  };
}

function createReaddirPatches(archive: ArchiveFacade, executor: CacheExecutor) {
  function readdirSync(
    input: fs.PathLike,
    options?: OperationOptionsInput,
  ): CachedDirectoryValue[] {
    return executor.runSync(
      input,
      readdirOperation(options),
      () =>
        (
          originalFs.readdirSync as unknown as (
            input: fs.PathLike,
            options?: OperationOptionsInput,
          ) => DirectoryValue[]
        )(input, options),
      (value: DirectoryValue[]) => snapshotDirectoryResult(value, archive),
      (value: CachedDirectoryEntry[]) => restoreDirectoryResult(value, archive),
    );
  }

  function readdirPromise(
    input: fs.PathLike,
    options?: OperationOptionsInput,
  ): Promise<CachedDirectoryValue[]> {
    return executor.runAsync(
      input,
      readdirOperation(options),
      () =>
        (
          originalPromises.readdir as unknown as (
            input: fs.PathLike,
            options?: OperationOptionsInput,
          ) => Promise<DirectoryValue[]>
        )(input, options),
      (value: DirectoryValue[]) => snapshotDirectoryResult(value, archive),
      (value: CachedDirectoryEntry[]) => restoreDirectoryResult(value, archive),
    );
  }

  function readdir(
    input: fs.PathLike,
    options: OperationOptionsInput | ValueCallback<CachedDirectoryValue[]>,
    callback?: ValueCallback<CachedDirectoryValue[]>,
  ): void {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const done = requireCallback(callback, 'fs.readdir');
    readdirPromise(input, options).then(
      value => done(null, value),
      error => done(error),
    );
  }

  return { readdir, readdirPromise, readdirSync };
}
