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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  type ArchiveOptions,
  type CachedDirectoryEntry,
  type CachedStat,
  type FsCacheOutcome,
  FsCacheArchive,
  type PortablePath,
  type RealpathOperation,
} from './archive.js';
import { createDirectoryPatches } from './hook-directory.js';
import { getActiveArchive, requireActiveArchive, setActiveArchive } from './hook-state.js';
import { originalFs, originalPromises } from './hook-originals.js';
import {
  type CacheExecutor,
  cacheMiss,
  createExecutor,
  failure,
  makeCallback,
  missingPath,
  pathDisplay,
  pathOperation,
  requireCallback,
  restoreError,
  success,
} from './hook-core.js';
import {
  readdirOperation,
  restoreDirectoryResult,
  restoreName,
  restorePathResult,
  restoreStat,
  returnPathBuffer,
  returnReadBuffer,
  snapshotDirectoryResult,
  snapshotName,
  snapshotPathResult,
  snapshotStat,
  statOperation,
  withBufferEncoding,
  withoutEncoding,
} from './hook-snapshots.js';
import type {
  ArchiveFacade,
  BufferedRealpath,
  Callable,
  CachedDirectoryValue,
  CachedPathResult,
  CustomPromisifyFactory,
  DirectoryValue,
  ErrorCallback,
  FileDescriptorMap,
  FileHandleLike,
  FileHandleTracker,
  FsError,
  FunctionWithNative,
  OperationOptions,
  OperationOptionsInput,
  ReadArguments,
  ReadOptions,
  StatValue,
  ValueCallback,
} from './hook-types.js';

export const FS_CACHE_INSTALLATION = Symbol.for('sonarjs.filesystemCache.installation');
const CACHED_FILE_HANDLE = Symbol('cached filesystem file handle');
const FS_PROMISES_MODULE = 'fs/promises';
const REALPATH_NATIVE_OPERATION = 'realpath.native';

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

function selectFilesystemImplementation(
  cachedValue: FunctionWithNative,
  nativeValue: FunctionWithNative,
  nativeThis: unknown,
): FunctionWithNative {
  const selected: FunctionWithNative = function (this: unknown, ...args: unknown[]) {
    return getActiveArchive()
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

/** Operations with two independent filesystem targets rather than one leading path or handle. */
const PASSTHROUGH_TWO_PATH_OPERATIONS = new Set([
  'copyFile',
  'copyFileSync',
  'cp',
  'cpSync',
  'link',
  'linkSync',
  'rename',
  'renameSync',
]);
function isPathLike(value: unknown): value is fs.PathLike {
  return typeof value === 'string' || Buffer.isBuffer(value) || value instanceof URL;
}

function pathLikeToString(value: fs.PathLike): string {
  if (typeof value === 'string') {
    return value;
  }
  return Buffer.isBuffer(value) ? value.toString() : fileURLToPath(value as URL);
}

function isPassthroughDescriptor(fileDescriptors: FileDescriptorMap, descriptor: number): boolean {
  const tracked = fileDescriptors.get(descriptor);
  return tracked?.virtual === false && tracked.passthrough;
}

function isPassthroughInput(
  archive: ArchiveFacade,
  fileDescriptors: FileDescriptorMap,
  fileHandles: FileHandleTracker,
  input: unknown,
): boolean {
  if (typeof input === 'number') {
    return isPassthroughDescriptor(fileDescriptors, input);
  }
  if (isPathLike(input)) {
    return archive.isPassthrough(input);
  }
  return typeof input === 'object' && input !== null && fileHandles.isPassthrough(input);
}

function isPassthroughGlob(archive: ArchiveFacade, args: unknown[]): boolean {
  const patterns = Array.isArray(args[0]) ? args[0] : [args[0]];
  const options = typeof args[1] === 'object' && args[1] !== null ? args[1] : undefined;
  const cwd = (options as { cwd?: fs.PathLike } | undefined)?.cwd ?? process.cwd();
  if (!isPathLike(cwd)) {
    return false;
  }
  const cwdPath = pathLikeToString(cwd);
  return patterns.every(pattern => {
    if (typeof pattern !== 'string') {
      return false;
    }
    return archive.isPassthrough(path.resolve(cwdPath, pattern));
  });
}

function isPassthroughSymlink(archive: ArchiveFacade, args: unknown[]): boolean {
  const [target, destination] = args;
  if (!isPathLike(target) || !isPathLike(destination) || !archive.isPassthrough(destination)) {
    return false;
  }
  const targetPath = pathLikeToString(target);
  const destinationPath = pathLikeToString(destination);
  const resolvedTarget = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(path.dirname(path.resolve(destinationPath)), targetPath);
  return archive.isPassthrough(resolvedTarget);
}

function isPassthroughFilesystemOperation(
  archive: ArchiveFacade,
  fileDescriptors: FileDescriptorMap,
  fileHandles: FileHandleTracker,
  name: string,
  args: unknown[],
): boolean {
  if (name === 'glob' || name === 'globSync') {
    return isPassthroughGlob(archive, args);
  }
  if (name === 'symlink' || name === 'symlinkSync') {
    return isPassthroughSymlink(archive, args);
  }
  if (PASSTHROUGH_TWO_PATH_OPERATIONS.has(name)) {
    return (
      isPathLike(args[0]) &&
      archive.isPassthrough(args[0]) &&
      isPathLike(args[1]) &&
      archive.isPassthrough(args[1])
    );
  }
  if ((name === 'createReadStream' || name === 'createWriteStream') && args[1]) {
    const descriptor = (args[1] as { fd?: number }).fd;
    if (typeof descriptor === 'number' && isPassthroughDescriptor(fileDescriptors, descriptor)) {
      return true;
    }
  }
  return isPassthroughInput(archive, fileDescriptors, fileHandles, args[0]);
}

function guardUnhandledFilesystemOperations(
  target: object,
  patchedProperties: Set<PropertyKey>,
  nonOperations: Set<string>,
  moduleName: string,
  canPassthrough: (name: string, args: unknown[]) => boolean,
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
    patch(target, patchedProperties, name, (...args: unknown[]) => {
      if (canPassthrough(name, args)) {
        return Reflect.apply(value, target, args);
      }
      const error = unsupportedFilesystemOperation(moduleName, name);
      if (reject && !FS_PROMISE_ASYNC_ITERABLE_OPERATIONS.has(name)) {
        return Promise.reject(error);
      }
      throw error;
    });
  }
}

function decodeFileContent(value: Buffer | string): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, 'base64');
}

function createReadFilePatches(
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

function createOpenPatches(archive: ArchiveFacade, fileDescriptors: FileDescriptorMap) {
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

function createDescriptorPatches(
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

function createOpenPromise(
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
