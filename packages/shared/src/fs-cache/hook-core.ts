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
import type fs from 'node:fs';
import { getSystemErrorMap } from 'node:util';
import type { FsCacheErrorSnapshot, FsCacheOutcome } from './archive.js';
import { getEncoding } from './hook-snapshots.js';
import { getActiveArchive, requireActiveArchive } from './hook-state.js';
import type {
  ArchiveFacade,
  CacheInput,
  FsError,
  OperationOptions,
  OperationOptionsInput,
  ValueCallback,
} from './hook-types.js';

export const MISSING = Symbol('missing filesystem cache observation');
const DEFAULT_ENOENT_ERRNO = -2;
const ENOENT_ERRNO =
  [...getSystemErrorMap()].find(([, [code]]) => code === 'ENOENT')?.[0] ?? DEFAULT_ENOENT_ERRNO;

export function pathDisplay(input: fs.PathLike | number): string {
  if (Buffer.isBuffer(input)) {
    return input.toString();
  }
  return String(input);
}

function snapshotError(error: unknown): FsCacheErrorSnapshot {
  const filesystemError = error as FsError;
  const errorPath =
    filesystemError?.path === undefined ? undefined : pathDisplay(filesystemError.path);
  return {
    name: filesystemError?.name || 'Error',
    message: String(filesystemError?.message || error).replaceAll(errorPath || '\0', '$PATH'),
    code: filesystemError?.code,
    errno: filesystemError?.errno,
    syscall: filesystemError?.syscall,
  };
}

export function restoreError(snapshot: FsCacheErrorSnapshot, input: fs.PathLike | number): FsError {
  const currentPath = pathDisplay(input);
  const error = new Error(snapshot.message.replaceAll('$PATH', currentPath)) as FsError;
  error.name = snapshot.name;
  error.code = snapshot.code;
  error.errno = snapshot.errno;
  error.syscall = snapshot.syscall;
  error.path = currentPath;
  return error;
}

export function cacheMiss(operation: string, input: fs.PathLike | number): FsError {
  const error = new Error(
    `Filesystem cache has no ${operation} observation for '${pathDisplay(input)}'`,
  ) as FsError;
  error.name = 'FsCacheMissError';
  error.code = 'ERR_SONARJS_FS_CACHE_MISS';
  error.path = pathDisplay(input);
  error.syscall = operation.split(':', 1)[0];
  return error;
}

export function missingPath(
  operation: string,
  input: fs.PathLike | number,
): false | undefined | never {
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
  error.errno = ENOENT_ERRNO;
  error.path = currentPath;
  error.syscall = syscall;
  throw error;
}

export function success<T>(value: T): FsCacheOutcome<T> {
  return { ok: true, value };
}

export function failure(error: unknown): FsCacheOutcome<never> {
  return { ok: false, error: snapshotError(error) };
}

export function createExecutor(archive: ArchiveFacade) {
  function replay<TStored, TResult = TStored>(
    input: CacheInput,
    operation: string,
    decode: (value: TStored) => TResult = value => value as unknown as TResult,
  ): TResult | typeof MISSING {
    const key =
      typeof input === 'number' || (typeof input === 'object' && 'fd' in input)
        ? undefined
        : archive.keyFor(input);
    if (key === undefined) {
      if (
        typeof input !== 'number' &&
        !(typeof input === 'object' && 'fd' in input) &&
        archive.blocksNativeRead(input)
      ) {
        return missingPath(operation, input) as TResult;
      }
      return MISSING;
    }
    const outcome = archive.get<TStored>(key, operation);
    if (outcome === undefined) {
      if (archive.getExists(key, operation) === false) {
        archive.recordCacheHit();
        return missingPath(operation, input as fs.PathLike | number) as TResult;
      }
      archive.recordCacheMiss();
      if (archive.mode === 'replay') {
        throw cacheMiss(operation, input as fs.PathLike | number);
      }
      return MISSING;
    }
    archive.recordCacheHit();
    if (!outcome.ok) {
      throw restoreError(outcome.error, input as fs.PathLike | number);
    }
    return decode(outcome.value);
  }

  function runSync<TValue, TStored = TValue>(
    input: CacheInput,
    operation: string,
    producer: () => TValue,
    encode: (value: TValue) => TStored = value => value as unknown as TStored,
    decode: (value: TStored) => TValue = value => value as unknown as TValue,
  ): TValue {
    const replayed = replay(input, operation, decode);
    if (replayed !== MISSING) {
      return replayed as TValue;
    }

    const key =
      typeof input === 'number' || (typeof input === 'object' && 'fd' in input)
        ? undefined
        : archive.keyFor(input);
    try {
      const value = producer();
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, success(encode(value)));
      }
      return value;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  async function runAsync<TValue, TStored = TValue>(
    input: CacheInput,
    operation: string,
    producer: () => Promise<TValue>,
    encode: (value: TValue) => TStored = value => value as unknown as TStored,
    decode: (value: TStored) => TValue = value => value as unknown as TValue,
  ): Promise<TValue> {
    const readingArchive = requireActiveArchive();
    const replayed = replay(input, operation, decode);
    if (replayed !== MISSING) {
      return replayed as TValue;
    }

    const key =
      typeof input === 'number' || (typeof input === 'object' && 'fd' in input)
        ? undefined
        : archive.keyFor(input);
    try {
      const value = await producer();
      if (getActiveArchive() === readingArchive && archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, success(encode(value)));
      }
      return value;
    } catch (error) {
      if (getActiveArchive() === readingArchive && archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  return { replay, runAsync, runSync };
}

export function makeCallback<T>(
  promiseFunction: (input: fs.PathLike, options?: OperationOptions) => Promise<T>,
) {
  return (
    input: fs.PathLike,
    options: OperationOptions | ValueCallback<T> | undefined,
    callback?: ValueCallback<T>,
  ) => {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const done = requireCallback(callback, 'filesystem callback operation');
    promiseFunction(input, options).then(
      value => done(null, value),
      error => done(error),
    );
  };
}

export function requireCallback<T>(callback: T | undefined, operation: string): T {
  if (!callback) {
    throw new TypeError(`${operation} requires a callback`);
  }
  return callback;
}

export function pathOperation(name: string, options: OperationOptionsInput): string {
  return name.startsWith('realpath') ? name : `${name}:${getEncoding(options) || 'utf8'}`;
}

export function opendirOperation(options: OperationOptions | undefined): string {
  return `opendir:${getEncoding(options) || 'utf8'}:${Boolean(options?.recursive)}`;
}
export type CacheExecutor = ReturnType<typeof createExecutor>;
