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
import { getSystemErrorMap, promisify } from 'node:util';
import {
  type ArchiveOptions,
  type CachedDirectoryEntry,
  type CachedStat,
  type FsCacheOutcome,
  FsCacheArchive,
  type PortablePath,
  type RealpathOperation,
} from './archive.js';
import {
  type CachedDirectoryValue,
  type CachedPathResult,
  type DirectoryValue,
  type FsError,
  pathDisplay,
  restoreDirectoryResult,
  restoreError,
  restoreName,
  restorePathResult,
  restoreStat,
  snapshotDirectoryResult,
  snapshotError,
  snapshotName,
  snapshotPathResult,
  snapshotStat,
  type StatValue,
} from './snapshot.js';
import { createDirectoryPatches, MISSING } from './directory.js';
import {
  createDescriptorPatches,
  type FileDescriptorMap,
  type FileHandleLike,
  type FileHandleTracker,
  type OperationOptions as DescriptorOperationOptions,
  type OperationOptionsInput as DescriptorOperationOptionsInput,
} from './file-descriptors.js';
import { createOpenPatches, createOpenPromise } from './file-open.js';
import { createReadFilePatches } from './file-read.js';

export const FS_CACHE_INSTALLATION = Symbol.for('sonarjs.filesystemCache.installation');
const FS_PROMISES_MODULE = 'fs/promises';
const REALPATH_NATIVE_OPERATION = 'realpath.native';
const DEFAULT_ENOENT_ERRNO = -2;
let activeArchive: FsCacheArchive | undefined;

type Callable = (...args: never[]) => unknown;
type FunctionWithNative = Callable & { native?: FunctionWithNative };
type CustomPromisifyFactory = (selected: FunctionWithNative) => Callable;
type EncodingOption = BufferEncoding | 'buffer' | null;
type OperationOptions = DescriptorOperationOptions;
type OperationOptionsInput = DescriptorOperationOptionsInput;
type ErrorCallback = (error: NodeJS.ErrnoException | null) => void;
type ValueCallback<T> = (error: NodeJS.ErrnoException | null, value?: T) => void;
type BufferedRealpath = (
  input: fs.PathLike,
  options: OperationOptions | 'buffer',
  callback: ValueCallback<Buffer>,
) => void;
type CacheInput = fs.PathLike | number | FileHandleLike;
type CacheExecutor = ReturnType<typeof createExecutor>;
type ArchiveFacade = Pick<
  FsCacheArchive,
  | 'decodePortablePath'
  | 'encodePortablePath'
  | 'get'
  | 'getExists'
  | 'keyFor'
  | 'recordCacheHit'
  | 'recordCacheMiss'
  | 'set'
> & { readonly mode: FsCacheArchive['mode'] | undefined };
export type FsCacheSession = { end(): void };
export type FsCacheInstallation = {
  beginAnalysis(options: ArchiveOptions): FsCacheSession;
  getStatistics(): { hits: number; misses: number; paths: number };
};
const installations = globalThis as typeof globalThis & {
  [FS_CACHE_INSTALLATION]?: FsCacheInstallation;
};

function requireActiveArchive() {
  if (!activeArchive) {
    throw new Error('No filesystem cache analysis is active');
  }
  return activeArchive;
}

const activeArchiveFacade: ArchiveFacade = {
  get mode() {
    return activeArchive?.mode;
  },
  keyFor(input: fs.PathLike) {
    return activeArchive?.keyFor(input);
  },
  get<T = unknown>(key: string, operation: string) {
    return requireActiveArchive().get<T>(key, operation);
  },
  getExists(key: string, operation?: string) {
    return requireActiveArchive().getExists(key, operation);
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
const ENOENT_ERRNO =
  [...getSystemErrorMap()].find(([, [code]]) => code === 'ENOENT')?.[0] ?? DEFAULT_ENOENT_ERRNO;

/** Exports that are values or types rather than filesystem operations. */
const FS_NON_OPERATION_EXPORTS = new Set([
  'F_OK',
  'R_OK',
  'W_OK',
  'X_OK',
  'constants',
  'promises',
  'Dir',
  'Dirent',
  'FSWatcher',
  'FileReadStream',
  'FileWriteStream',
  'ReadStream',
  'StatWatcher',
  'Stats',
  'WriteStream',
  '_StatWatcher',
]);

/** fs/promises operations that synchronously return async iterables instead of promises. */
const FS_PROMISE_ASYNC_ITERABLE_OPERATIONS = new Set(['glob', 'watch']);

const originalFs = {
  access: fs.access.bind(fs),
  accessSync: fs.accessSync.bind(fs),
  close: fs.close.bind(fs),
  closeSync: fs.closeSync.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  fstat: fs.fstat.bind(fs),
  fstatSync: fs.fstatSync.bind(fs),
  lstat: fs.lstat.bind(fs),
  lstatSync: fs.lstatSync.bind(fs),
  open: fs.open.bind(fs),
  openSync: fs.openSync.bind(fs),
  opendir: fs.opendir.bind(fs),
  opendirSync: fs.opendirSync.bind(fs),
  read: fs.read.bind(fs),
  readFile: fs.readFile.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
  readSync: fs.readSync.bind(fs),
  readdir: fs.readdir.bind(fs),
  readdirSync: fs.readdirSync.bind(fs),
  readlink: fs.readlink.bind(fs),
  readlinkSync: fs.readlinkSync.bind(fs),
  realpath: fs.realpath.bind(fs),
  realpathNative: fs.realpath.native.bind(fs.realpath),
  realpathSync: fs.realpathSync.bind(fs),
  realpathSyncNative: fs.realpathSync.native.bind(fs.realpathSync),
  stat: fs.stat.bind(fs),
  statSync: fs.statSync.bind(fs),
  writeSync: fs.writeSync.bind(fs),
};

const originalPromises = {
  access: fs.promises.access.bind(fs.promises),
  lstat: fs.promises.lstat.bind(fs.promises),
  open: fs.promises.open.bind(fs.promises),
  opendir: fs.promises.opendir.bind(fs.promises),
  readFile: fs.promises.readFile.bind(fs.promises),
  readdir: fs.promises.readdir.bind(fs.promises),
  readlink: fs.promises.readlink.bind(fs.promises),
  realpath: fs.promises.realpath.bind(fs.promises),
  stat: fs.promises.stat.bind(fs.promises),
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
  error.errno = ENOENT_ERRNO;
  error.path = currentPath;
  error.syscall = syscall;
  throw error;
}

function success<T>(value: T): FsCacheOutcome<T> {
  return { ok: true, value };
}

function failure(error: unknown): FsCacheOutcome<never> {
  return { ok: false, error: snapshotError(error) };
}

function createExecutor(archive: ArchiveFacade) {
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

  return { replay, runAsync, runSync };
}

function getEncoding(options: OperationOptionsInput): EncodingOption | undefined {
  if (typeof options === 'string') {
    return options;
  }
  return options?.encoding || undefined;
}

function statOperation(name: string, options: { bigint?: boolean; throwIfNoEntry?: boolean } = {}) {
  const result = options?.throwIfNoEntry === false ? 'soft' : 'throw';
  return `${name}:${options?.bigint ? 'bigint' : 'number'}:${result}`;
}

function readdirOperation(options: OperationOptionsInput): string {
  const normalized = typeof options === 'string' ? { encoding: options } : options || {};
  return `readdir:${normalized.encoding || 'utf8'}:${Boolean(normalized.withFileTypes)}:${Boolean(normalized.recursive)}`;
}

function withBufferEncoding(options: OperationOptionsInput): OperationOptions | 'buffer' {
  return options && typeof options === 'object' ? { ...options, encoding: 'buffer' } : 'buffer';
}

function returnPathBuffer(value: Uint8Array, options: OperationOptionsInput): string | Buffer {
  const encoding = getEncoding(options) || 'utf8';
  return encoding === 'buffer' ? Buffer.from(value) : Buffer.from(value).toString(encoding);
}

function makeCallback<T>(
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

function requireCallback<T>(callback: T | undefined, operation: string): T {
  if (!callback) {
    throw new TypeError(`${operation} requires a callback`);
  }
  return callback;
}

function realpathAsPromise(
  original: BufferedRealpath,
  input: fs.PathLike,
  options: OperationOptions | 'buffer',
  operation: string,
) {
  return new Promise<Buffer>((resolve, reject) =>
    original(input, options, (error, value) => {
      if (error) {
        reject(error);
      } else if (value === undefined) {
        reject(new Error(`${operation} returned no path`));
      } else {
        resolve(value);
      }
    }),
  );
}

function pathOperation(name: string, options: OperationOptionsInput): string {
  return name.startsWith('realpath') ? name : `${name}:${getEncoding(options) || 'utf8'}`;
}

function selectFilesystemImplementation(
  cachedValue: FunctionWithNative,
  nativeValue: FunctionWithNative,
  nativeThis: unknown,
): FunctionWithNative {
  const selected: FunctionWithNative = function (this: unknown, ...args: unknown[]) {
    return activeArchive
      ? Reflect.apply(cachedValue, this, args)
      : Reflect.apply(nativeValue, nativeThis, args);
  };
  if (typeof cachedValue.native === 'function' && typeof nativeValue.native === 'function') {
    selected.native = selectFilesystemImplementation(
      cachedValue.native,
      nativeValue.native,
      nativeValue,
    );
  }
  return selected;
}

function preserveFunctionMetadata(
  selected: FunctionWithNative,
  nativeValue: FunctionWithNative,
  customPromisifyFactory?: CustomPromisifyFactory,
): void {
  for (const symbol of Object.getOwnPropertySymbols(nativeValue)) {
    if (symbol === promisify.custom) {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(nativeValue, symbol);
    if (descriptor) {
      Object.defineProperty(selected, symbol, descriptor);
    }
  }

  const customPromisifyDescriptor = Object.getOwnPropertyDescriptor(nativeValue, promisify.custom);
  if (customPromisifyDescriptor && customPromisifyFactory) {
    Object.defineProperty(selected, promisify.custom, {
      ...customPromisifyDescriptor,
      value: customPromisifyFactory(selected),
    });
  }
}

function patch(
  target: object,
  patchedProperties: Set<PropertyKey>,
  name: PropertyKey,
  value: Callable,
  customPromisifyFactory?: CustomPromisifyFactory,
): void {
  const savedDescriptor = Object.getOwnPropertyDescriptor(target, name);
  if (!savedDescriptor) {
    throw new Error(`Cannot patch missing filesystem property: ${String(name)}`);
  }
  patchedProperties.add(name);
  const nativeValue =
    typeof savedDescriptor.get === 'function'
      ? (target as Record<PropertyKey, unknown>)[name]
      : savedDescriptor.value;
  const selected = selectFilesystemImplementation(
    value as FunctionWithNative,
    nativeValue as FunctionWithNative,
    target,
  );
  preserveFunctionMetadata(selected, nativeValue as FunctionWithNative, customPromisifyFactory);
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: selected,
  });
}

function unsupportedFilesystemOperation(moduleName: string, name: PropertyKey): FsError {
  const error = new Error(
    `Filesystem cache does not support ${moduleName}.${String(name)} from Node ${process.version}`,
  ) as FsError;
  error.name = 'UnsupportedFsOperationError';
  error.code = 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION';
  return error;
}

function guardUnhandledFilesystemOperations(
  target: object,
  patchedProperties: Set<PropertyKey>,
  nonOperations: Set<string>,
  moduleName: string,
  reject = false,
) {
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
    if (patchedProperties.has(name) || nonOperations.has(name)) {
      continue;
    }
    const value =
      typeof descriptor.get === 'function'
        ? (target as Record<string, unknown>)[name]
        : descriptor.value;
    if (typeof value !== 'function') {
      continue;
    }
    patch(target, patchedProperties, name, () => {
      const error = unsupportedFilesystemOperation(moduleName, name);
      if (reject && !FS_PROMISE_ASYNC_ITERABLE_OPERATIONS.has(name)) {
        return Promise.reject(error);
      }
      throw error;
    });
  }
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

function createBasicPatches(archive: ArchiveFacade, executor: CacheExecutor) {
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

function installPatches(archive: ArchiveFacade) {
  const executor = createExecutor(archive);
  const patchedProperties = new Set<PropertyKey>();
  const patchedPromiseProperties = new Set<PropertyKey>();
  const fileDescriptors: FileDescriptorMap = new Map();
  const fileHandles: FileHandleTracker & { values: WeakSet<object> } = {
    values: new WeakSet<object>(),
    add(value: object) {
      this.values.add(value);
    },
    clear() {
      this.values = new WeakSet<object>();
    },
    has(value: object) {
      return this.values.has(value);
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
  // descriptors so diagnostics work without allowing project files to be mutated through an fd.
  patch(fs, patchedProperties, 'writeSync', (fd: number, ...args: unknown[]) => {
    if (fd !== 1 && fd !== 2) {
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

  guardUnhandledFilesystemOperations(fs, patchedProperties, FS_NON_OPERATION_EXPORTS, 'fs');
  guardUnhandledFilesystemOperations(
    fs.promises,
    patchedPromiseProperties,
    new Set(),
    FS_PROMISES_MODULE,
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
    if (!activeArchive) {
      return;
    }
    try {
      activeArchive.flush();
    } catch (error: unknown) {
      reportFlushFailure(activeArchive, error);
    }
  };
  process.once('exit', exitListener);

  const installation: FsCacheInstallation = {
    beginAnalysis(analysisOptions: ArchiveOptions) {
      if (activeArchive) {
        throw new Error('A filesystem cache analysis is already active');
      }
      const archive = new FsCacheArchive(analysisOptions);
      if (archive.mode === 'replay') {
        archive.load();
      }
      activeArchive = archive;
      let ended = false;
      return {
        end() {
          if (ended) {
            return;
          }
          if (activeArchive !== archive) {
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
            activeArchive = undefined;
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
