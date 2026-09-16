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
import { getSystemErrorMap } from 'node:util';
import {
  type ArchiveOptions,
  type CachedDirectoryEntry,
  type CachedName,
  type CachedStat,
  DIRENT_TYPES,
  type FsCacheErrorSnapshot,
  type FsCacheOutcome,
  FS_TYPE_METHODS,
  FsCacheArchive,
  type PortablePath,
} from './archive.js';

const MISSING = Symbol('missing filesystem cache observation');
const INSTALLATION = Symbol.for('sonarjs.filesystemCache.installation');
const CACHED_FILE_HANDLE = Symbol('cached filesystem file handle');
let activeArchive: FsCacheArchive | undefined;

type FsError = Error & {
  code?: string;
  errno?: number;
  syscall?: string;
  path?: string;
};
type Callable = (...args: never[]) => unknown;
type FunctionWithNative = Callable & { native?: FunctionWithNative };
type EncodingOption = BufferEncoding | 'buffer' | null;
type OperationOptions = {
  encoding?: EncodingOption;
  withFileTypes?: boolean;
  recursive?: boolean;
  bigint?: boolean;
  throwIfNoEntry?: boolean;
};
type OperationOptionsInput = OperationOptions | BufferEncoding | 'buffer' | null | undefined;
type ReadOptions = OperationOptions & {
  buffer?: NodeJS.ArrayBufferView;
  offset?: number;
  length?: number;
  position?: number | bigint | null;
};
type ReadArguments =
  [ReadOptions] | [offset?: number, length?: number, position?: number | bigint | null];
type CachedPathResult = { path: PortablePath };
type DirectoryValue = string | Buffer | fs.Dirent<string | Buffer>;
type CachedDirectoryValue = string | Buffer | fs.Dirent<string | Buffer>;
type StatValue = fs.Stats | fs.BigIntStats;
type ErrorCallback = (error: NodeJS.ErrnoException | null) => void;
type ValueCallback<T> = (error: NodeJS.ErrnoException | null, value?: T) => void;
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
type FileDescriptorMap = Map<number, TrackedDescriptor>;
type FileHandleLike = { fd: number };
type CacheInput = fs.PathLike | number | FileHandleLike;
type FileHandleTracker = {
  add(value: object): void;
  clear(): void;
  has(value: object): boolean;
};
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
type FsCacheSession = { archive: FsCacheArchive; end(): void };
export type FsCacheInstallation = {
  readonly archive: FsCacheArchive | undefined;
  beginAnalysis(options: ArchiveOptions): FsCacheSession;
  flush(): void;
  getStatistics(): { hits: number; misses: number; paths: number };
  uninstall(): void;
};
const installations = globalThis as typeof globalThis & {
  [INSTALLATION]?: FsCacheInstallation;
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
  decodePortablePath(filePath: PortablePath) {
    return requireActiveArchive().decodePortablePath(filePath);
  },
  recordCacheHit() {
    return requireActiveArchive().recordCacheHit();
  },
  recordCacheMiss() {
    return requireActiveArchive().recordCacheMiss();
  },
};
const ENOENT_ERRNO = [...getSystemErrorMap()].find(([, [code]]) => code === 'ENOENT')?.[0] ?? -2;

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

function pathDisplay(input: fs.PathLike | number): string {
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

function restoreError(snapshot: FsCacheErrorSnapshot, input: fs.PathLike | number): FsError {
  const currentPath = pathDisplay(input);
  const error = new Error(snapshot.message.replaceAll('$PATH', currentPath)) as FsError;
  error.name = snapshot.name;
  error.code = snapshot.code;
  error.errno = snapshot.errno;
  error.syscall = snapshot.syscall;
  error.path = currentPath;
  return error;
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
  ): TResult | typeof MISSING | false | undefined {
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

function snapshotStat(stat: StatValue): CachedStat {
  const indexedStat = stat as unknown as Record<string, number | bigint | undefined>;
  const fields = [
    'dev',
    'ino',
    'mode',
    'nlink',
    'uid',
    'gid',
    'rdev',
    'size',
    'blksize',
    'blocks',
    'atimeMs',
    'mtimeMs',
    'ctimeMs',
    'birthtimeMs',
    'atimeNs',
    'mtimeNs',
    'ctimeNs',
    'birthtimeNs',
  ] as const;
  return {
    fields: Object.fromEntries(
      fields.map(field => [
        field,
        indexedStat[field] === undefined ? undefined : String(indexedStat[field]),
      ]),
    ),
    types: Object.fromEntries(
      Object.entries(FS_TYPE_METHODS).map(([type, method]) => [type, stat[method]()]),
    ),
  };
}

function restoreStat(snapshot: CachedStat, bigint = false): StatValue {
  const stat = Object.create(fs.Stats.prototype) as Record<string, unknown>;
  for (const [field, value] of Object.entries(snapshot.fields)) {
    if (value !== undefined) {
      if (bigint) {
        const text = String(value);
        stat[field] = /^-?\d+$/.test(text) ? BigInt(text) : BigInt(Math.trunc(Number(value)));
      } else {
        stat[field] = Number(value);
      }
    }
  }
  for (const field of ['atime', 'mtime', 'ctime', 'birthtime']) {
    const milliseconds = Number(snapshot.fields[`${field}Ms`]);
    stat[field] = new Date(milliseconds);
    if (bigint && stat[`${field}Ns`] === undefined) {
      stat[`${field}Ns`] = BigInt(Math.trunc(milliseconds * 1_000_000));
    }
  }
  for (const [type, method] of Object.entries(FS_TYPE_METHODS)) {
    stat[method] = () => snapshot.types[type];
  }
  return stat as unknown as StatValue;
}

function statOperation(name: string, options: { bigint?: boolean; throwIfNoEntry?: boolean } = {}) {
  const result = options?.throwIfNoEntry === false ? 'soft' : 'throw';
  return `${name}:${options?.bigint ? 'bigint' : 'number'}:${result}`;
}

function snapshotName(name: string | Buffer): CachedName {
  return Buffer.isBuffer(name)
    ? { kind: 'buffer', value: name.toString('base64') }
    : { kind: 'string', value: name };
}

function restoreName(name: CachedName): string | Buffer {
  return name.kind === 'buffer' ? Buffer.from(name.value, 'base64') : name.value;
}

function direntType(dirent: fs.Dirent<string | Buffer>): string {
  return (
    DIRENT_TYPES.slice(1).find(type => {
      const method = FS_TYPE_METHODS[type as keyof typeof FS_TYPE_METHODS];
      return method ? dirent[method]() : false;
    }) || 'unknown'
  );
}

function snapshotDirectoryResult(
  result: DirectoryValue[],
  archive: ArchiveFacade,
): CachedDirectoryEntry[] {
  return result.map((entry: DirectoryValue) => {
    if (typeof entry === 'string' || Buffer.isBuffer(entry)) {
      return { kind: 'name', name: snapshotName(entry) };
    }
    return {
      kind: 'dirent',
      name: snapshotName(entry.name),
      type: direntType(entry),
      parentPath: archive.encodePortablePath(
        entry.parentPath || (entry as fs.Dirent<string | Buffer> & { path?: string }).path || '',
      ),
    };
  });
}

function createDirent(
  snapshot: Extract<CachedDirectoryEntry, { kind: 'dirent' }>,
  archive: ArchiveFacade,
) {
  const dirent = Object.create(fs.Dirent.prototype) as fs.Dirent<string | Buffer> &
    Record<string, unknown>;
  dirent.name = restoreName(snapshot.name);
  dirent.parentPath = archive.decodePortablePath(snapshot.parentPath);
  dirent.path = dirent.parentPath;
  for (const type of DIRENT_TYPES.slice(1)) {
    const method = FS_TYPE_METHODS[type as keyof typeof FS_TYPE_METHODS];
    if (method) dirent[method] = () => snapshot.type === type;
  }
  return dirent;
}

function restoreDirectoryResult(
  result: CachedDirectoryEntry[],
  archive: ArchiveFacade,
): CachedDirectoryValue[] {
  return result.map(entry =>
    entry.kind === 'name' ? restoreName(entry.name) : createDirent(entry, archive),
  );
}

function readdirOperation(options: OperationOptionsInput): string {
  const normalized = typeof options === 'string' ? { encoding: options } : options || {};
  return `readdir:${normalized.encoding || 'utf8'}:${Boolean(normalized.withFileTypes)}:${Boolean(normalized.recursive)}`;
}

function snapshotPathResult(value: string | Buffer, archive: ArchiveFacade): CachedPathResult {
  return {
    path: archive.encodePortablePath(value.toString()),
  };
}

function restorePathResult(value: CachedPathResult, archive: ArchiveFacade): Buffer {
  return Buffer.from(archive.decodePortablePath(value.path));
}

function withBufferEncoding(options: OperationOptionsInput): OperationOptions | 'buffer' {
  return options && typeof options === 'object' ? { ...options, encoding: 'buffer' } : 'buffer';
}

function returnPathBuffer(value: Uint8Array, options: OperationOptionsInput): string | Buffer {
  const encoding = getEncoding(options) || 'utf8';
  return encoding === 'buffer' ? Buffer.from(value) : Buffer.from(value).toString(encoding);
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
    promiseFunction(input, options).then(
      value => callback!(null, value),
      error => callback!(error),
    );
  };
}

function pathOperation(name: string, options: OperationOptionsInput): string {
  return name.startsWith('realpath') ? name : `${name}:${getEncoding(options) || 'utf8'}`;
}

function opendirOperation(options: OperationOptions | undefined): string {
  return `opendir:${getEncoding(options) || 'utf8'}:${Boolean(options?.recursive)}`;
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

function patch(
  target: object,
  savedDescriptors: Map<PropertyKey, PropertyDescriptor>,
  name: PropertyKey,
  value: Callable,
): void {
  const savedDescriptor = Object.getOwnPropertyDescriptor(target, name);
  if (!savedDescriptor) {
    throw new Error(`Cannot patch missing filesystem property: ${String(name)}`);
  }
  savedDescriptors.set(name, savedDescriptor);
  const nativeValue =
    typeof savedDescriptor.get === 'function'
      ? (target as Record<PropertyKey, unknown>)[name]
      : savedDescriptor.value;
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: selectFilesystemImplementation(
      value as FunctionWithNative,
      nativeValue as FunctionWithNative,
      target,
    ),
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
  savedDescriptors: Map<PropertyKey, PropertyDescriptor>,
  nonOperations: Set<string>,
  moduleName: string,
  reject = false,
) {
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
    if (savedDescriptors.has(name) || nonOperations.has(name)) {
      continue;
    }
    const value =
      typeof descriptor.get === 'function'
        ? (target as Record<string, unknown>)[name]
        : descriptor.value;
    if (typeof value !== 'function') {
      continue;
    }
    patch(target, savedDescriptors, name, () => {
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
      const remaining = tracked.content!.subarray(tracked.position);
      tracked.position = tracked.content!.length;
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
    if (cachedHandle[CACHED_FILE_HANDLE]) {
      return cachedHandle.readFile!(options);
    }
    if (typeof input === 'object' && 'fd' in input && !fileHandles.has(input)) {
      throw unsupportedFilesystemOperation('fs/promises', 'readFile with an unknown FileHandle');
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
    const tracked = typeof input === 'number' ? fileDescriptors.get(input) : undefined;
    if (typeof input === 'number' && !tracked) {
      throw unsupportedFilesystemOperation('fs', 'readFile with an unknown descriptor');
    }
    if (typeof input === 'number' && !tracked!.virtual) {
      (
        originalFs.readFile as unknown as (
          input: fs.PathOrFileDescriptor,
          options: OperationOptionsInput,
          callback: ValueCallback<Buffer | string>,
        ) => void
      )(input, options, callback!);
    } else {
      const result = tracked?.virtual
        ? Promise.resolve().then(() => readFileSync(input, options))
        : readFilePromise(input as fs.PathLike, options);
      result.then(
        value => callback!(null, value),
        error => callback!(error),
      );
    }
  }

  return { readFile, readFilePromise, readFileSync };
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
    readdirPromise(input, options).then(
      value => callback!(null, value),
      error => callback!(error),
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
    accessPromise(input, mode).then(
      () => callback!(null),
      error => callback!(error),
    );
  }

  function accessSync(input: fs.PathLike, mode = fs.constants.F_OK): void {
    return executor.runSync(input, `access:${mode}`, () => originalFs.accessSync(input, mode));
  }

  function makeRealpathSync(
    name: string,
    original: (input: fs.PathLike, options: OperationOptions | 'buffer') => Buffer,
  ) {
    return (input: fs.PathLike, options?: OperationOptionsInput) => {
      const value = executor.runSync(
        input,
        pathOperation(name, options),
        () => original(input, withBufferEncoding(options)),
        (value: Buffer) => snapshotPathResult(value, archive),
        (value: CachedPathResult) => restorePathResult(value, archive),
      );
      return returnPathBuffer(value, options);
    };
  }

  function makeRealpathPromise(
    name: string,
    original: (input: fs.PathLike, options: OperationOptions | 'buffer') => Promise<Buffer>,
  ) {
    return async (input: fs.PathLike, options?: OperationOptionsInput) => {
      const value = await executor.runAsync(
        input,
        pathOperation(name, options),
        () => original(input, withBufferEncoding(options)),
        (value: Buffer) => snapshotPathResult(value, archive),
        (value: CachedPathResult) => restorePathResult(value, archive),
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
    'realpath.native',
    originalFs.realpathSyncNative as unknown as Parameters<typeof makeRealpathSync>[1],
  );
  const realpathPromise = makeRealpathPromise(
    'realpath',
    originalPromises.realpath as unknown as Parameters<typeof makeRealpathPromise>[1],
  );
  const realpath = makeCallback(realpathPromise) as FunctionWithNative;
  realpath.native = makeCallback(
    makeRealpathPromise(
      'realpath.native',
      (input, options) =>
        new Promise((resolve, reject) =>
          (
            originalFs.realpathNative as unknown as (
              input: fs.PathLike,
              options: OperationOptions | 'buffer',
              callback: ValueCallback<Buffer>,
            ) => void
          )(input, options, (error, value) => (error ? reject(error) : resolve(value!))),
        ),
    ),
  );

  return {
    access,
    accessPromise,
    accessSync,
    exists,
    existsSync,
    lstatPromise,
    lstatSync,
    readdir,
    readdirPromise,
    readdirSync,
    readlinkPromise,
    readlinkSync,
    realpath,
    realpathPromise,
    realpathSync,
    statPromise,
    statSync,
  };
}

class CachedDir {
  declare readonly path: string;
  entries: CachedDirectoryValue[];
  index: number;
  closed: boolean;

  constructor(dirPath: fs.PathLike, entries: CachedDirectoryValue[]) {
    Object.defineProperty(this, 'path', {
      configurable: true,
      enumerable: true,
      value: pathDisplay(dirPath),
    });
    this.entries = entries;
    this.index = 0;
    this.closed = false;
  }

  read(callback?: ValueCallback<CachedDirectoryValue | null>) {
    const operation = () => this.readSync();
    if (callback) {
      try {
        const entry = operation();
        queueMicrotask(() => callback(null, entry));
      } catch (error) {
        queueMicrotask(() => callback(error as NodeJS.ErrnoException));
      }
      return undefined;
    }
    return Promise.resolve().then(operation);
  }

  readSync(): CachedDirectoryValue | null {
    if (this.closed) {
      const error = new Error('Directory handle was closed') as FsError;
      error.code = 'ERR_DIR_CLOSED';
      throw error;
    }
    const entry = this.entries[this.index] || null;
    this.index += 1;
    return entry;
  }

  close(callback?: ErrorCallback) {
    const operation = () => this.closeSync();
    if (callback) {
      try {
        operation();
        queueMicrotask(() => callback(null));
      } catch (error) {
        queueMicrotask(() => callback(error as NodeJS.ErrnoException));
      }
      return undefined;
    }
    return Promise.resolve().then(operation);
  }

  closeSync(): void {
    if (this.closed) {
      const error = new Error('Directory handle was closed') as FsError;
      error.code = 'ERR_DIR_CLOSED';
      throw error;
    }
    this.closed = true;
  }

  async *[Symbol.asyncIterator]() {
    try {
      let entry;
      while ((entry = this.readSync()) !== null) {
        yield entry;
      }
    } finally {
      if (!this.closed) {
        this.closeSync();
      }
    }
  }

  async [Symbol.asyncDispose]() {
    if (!this.closed) {
      await this.close();
    }
  }

  [Symbol.dispose]() {
    if (!this.closed) {
      this.closeSync();
    }
  }
}
Object.setPrototypeOf(CachedDir.prototype, fs.Dir.prototype);

function readDirectoryWithOpendirSync(input: fs.PathLike, options?: OperationOptions): fs.Dirent[] {
  const directory = (
    originalFs.opendirSync as unknown as (input: fs.PathLike, options?: OperationOptions) => fs.Dir
  )(input, options);
  try {
    const entries: fs.Dirent[] = [];
    let entry: fs.Dirent | null;
    while ((entry = directory.readSync()) !== null) {
      entries.push(entry);
    }
    return entries;
  } finally {
    directory.closeSync();
  }
}

async function readDirectoryWithOpendir(
  input: fs.PathLike,
  options?: OperationOptions,
): Promise<fs.Dirent[]> {
  const directory = await (
    originalPromises.opendir as unknown as (
      input: fs.PathLike,
      options?: OperationOptions,
    ) => Promise<fs.Dir>
  )(input, options);
  try {
    const entries: fs.Dirent[] = [];
    let entry: fs.Dirent | null;
    while ((entry = await directory.read()) !== null) {
      entries.push(entry);
    }
    return entries;
  } finally {
    await directory.close();
  }
}

function createDirectoryPatches(archive: ArchiveFacade, executor: CacheExecutor) {
  function opendirSync(input: fs.PathLike, options?: OperationOptions): fs.Dir | CachedDir {
    const operation = opendirOperation(options);
    const replayed = executor.replay<CachedDirectoryEntry[], CachedDirectoryValue[]>(
      input,
      operation,
      value => restoreDirectoryResult(value, archive),
    );
    if (replayed !== MISSING) {
      return new CachedDir(input, replayed as CachedDirectoryValue[]);
    }

    const key = archive.keyFor(input);
    try {
      const directory = (
        originalFs.opendirSync as unknown as (
          input: fs.PathLike,
          options?: OperationOptions,
        ) => fs.Dir
      )(input, options);
      if (archive.mode === 'record' && key !== undefined) {
        try {
          const entries = readDirectoryWithOpendirSync(input, options);
          archive.set(key, operation, success(snapshotDirectoryResult(entries, archive)));
        } catch {
          // Auxiliary capture must not alter a successful opendir call.
        }
      }
      return directory;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  async function opendirPromise(
    input: fs.PathLike,
    options?: OperationOptions,
  ): Promise<fs.Dir | CachedDir> {
    const operation = opendirOperation(options);
    const replayed = executor.replay<CachedDirectoryEntry[], CachedDirectoryValue[]>(
      input,
      operation,
      value => restoreDirectoryResult(value, archive),
    );
    if (replayed !== MISSING) {
      return new CachedDir(input, replayed as CachedDirectoryValue[]);
    }

    const key = archive.keyFor(input);
    try {
      const directory = await (
        originalPromises.opendir as unknown as (
          input: fs.PathLike,
          options?: OperationOptions,
        ) => Promise<fs.Dir>
      )(input, options);
      if (archive.mode === 'record' && key !== undefined) {
        try {
          const entries = await readDirectoryWithOpendir(input, options);
          archive.set(key, operation, success(snapshotDirectoryResult(entries, archive)));
        } catch {
          // Auxiliary capture must not alter a successful opendir call.
        }
      }
      return directory;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  function opendir(
    input: fs.PathLike,
    options: OperationOptions | ValueCallback<fs.Dir | CachedDir> | undefined,
    callback?: ValueCallback<fs.Dir | CachedDir>,
  ): void {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    opendirPromise(input, options).then(
      value => callback!(null, value),
      error => callback!(error),
    );
  }

  return { opendir, opendirPromise, opendirSync };
}

type ReplayOpenResult = { found: false } | { fd: number; found: true };

function createOpenPatches(archive: ArchiveFacade, fileDescriptors: FileDescriptorMap) {
  let nextFileDescriptor = 0x3fffffff;

  function captureOpenedFile(input: fs.PathLike, fd: number): void {
    const key = archive.keyFor(input);
    if (key === undefined || archive.mode !== 'record') {
      return;
    }
    if (archive.get(key, 'readFile') === undefined) {
      try {
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
        const content = Buffer.concat(chunks);
        archive.set(key, 'readFile', success(content));
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
    try {
      const key = archive.keyFor(input);
      if (readonlyFlags(flags) && key !== undefined) {
        const fd = openSync(input, flags, mode);
        queueMicrotask(() => callback!(null, fd));
        return;
      }
    } catch (error) {
      queueMicrotask(() => callback!(error as NodeJS.ErrnoException));
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
      callback!(error, fd);
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
    const { offset, length, position } = readArguments(buffer, args);
    const sequential = position === null || position === undefined;
    const requestedStart = Number(sequential ? tracked.position : position);
    const content = tracked.content!;
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
    const outcome = archive.get<CachedStat>(tracked.key!, statOperation('fstat', options));
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
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'fstat with an unknown descriptor');
    }
    if (tracked?.virtual) {
      try {
        const stat = fstatSync(fd, options);
        queueMicrotask(() => callback!(null, stat));
      } catch (error) {
        queueMicrotask(() => callback!(error as NodeJS.ErrnoException));
      }
      return;
    }
    (
      originalFs.fstat as unknown as (
        fd: number,
        options: OperationOptions | undefined,
        callback: ValueCallback<StatValue>,
      ) => void
    )(fd, options, callback!);
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

    async read(
      buffer?: NodeJS.ArrayBufferView | ReadOptions,
      ...args: ReadArguments
    ): Promise<{ bytesRead: number | undefined; buffer: NodeJS.ArrayBufferView }> {
      if (!ArrayBuffer.isView(buffer)) {
        const options = (buffer ?? {}) as ReadOptions;
        const target = options.buffer ?? Buffer.alloc(16_384);
        return { bytesRead: readVirtual(this.fd, target, [options]), buffer: target };
      }
      return { bytesRead: readVirtual(this.fd, buffer, args), buffer };
    }

    async readFile(options?: OperationOptionsInput) {
      return readFileSync(this.fd, options);
    }

    async stat(options?: OperationOptions) {
      return fstatSync(this.fd, options);
    }

    async close() {
      closeSync(this.fd);
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

function installPatches(archive: ArchiveFacade) {
  const executor = createExecutor(archive);
  const descriptors = new Map<PropertyKey, PropertyDescriptor>();
  const promiseDescriptors = new Map<PropertyKey, PropertyDescriptor>();
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

  patch(fs, descriptors, 'readFileSync', readFile.readFileSync);
  patch(fs, descriptors, 'readFile', readFile.readFile);
  patch(fs, descriptors, 'readdirSync', basic.readdirSync);
  patch(fs, descriptors, 'readdir', basic.readdir);
  patch(fs, descriptors, 'existsSync', basic.existsSync);
  patch(fs, descriptors, 'exists', basic.exists);
  patch(fs, descriptors, 'accessSync', basic.accessSync);
  patch(fs, descriptors, 'access', basic.access);
  patch(fs, descriptors, 'statSync', basic.statSync);
  patch(fs, descriptors, 'stat', makeCallback(basic.statPromise));
  patch(fs, descriptors, 'lstatSync', basic.lstatSync);
  patch(fs, descriptors, 'lstat', makeCallback(basic.lstatPromise));
  patch(fs, descriptors, 'realpathSync', basic.realpathSync);
  patch(fs, descriptors, 'realpath', basic.realpath);
  patch(fs, descriptors, 'readlinkSync', basic.readlinkSync);
  patch(fs, descriptors, 'readlink', makeCallback(basic.readlinkPromise));
  patch(fs, descriptors, 'opendirSync', directory.opendirSync);
  patch(fs, descriptors, 'opendir', directory.opendir);
  patch(fs, descriptors, 'openSync', openPatches.openSync);
  patch(fs, descriptors, 'open', openPatches.open);
  patch(fs, descriptors, 'readSync', descriptor.readSync);
  patch(fs, descriptors, 'read', descriptor.read);
  patch(fs, descriptors, 'fstatSync', descriptor.fstatSync);
  patch(fs, descriptors, 'fstat', descriptor.fstat);
  patch(fs, descriptors, 'closeSync', descriptor.closeSync);
  patch(fs, descriptors, 'close', descriptor.close);
  // Node stdout and stderr use this primitive. Limit the native pass-through to their standard
  // descriptors so diagnostics work without allowing project files to be mutated through an fd.
  patch(fs, descriptors, 'writeSync', (fd: number, ...args: unknown[]) => {
    if (fd !== 1 && fd !== 2) {
      throw unsupportedFilesystemOperation('fs', 'writeSync outside stdout or stderr');
    }
    return (originalFs.writeSync as unknown as (fd: number, ...args: unknown[]) => number)(
      fd,
      ...args,
    );
  });

  patch(fs.promises, promiseDescriptors, 'readFile', readFile.readFilePromise);
  patch(fs.promises, promiseDescriptors, 'readdir', basic.readdirPromise);
  patch(fs.promises, promiseDescriptors, 'access', basic.accessPromise);
  patch(fs.promises, promiseDescriptors, 'stat', basic.statPromise);
  patch(fs.promises, promiseDescriptors, 'lstat', basic.lstatPromise);
  patch(fs.promises, promiseDescriptors, 'realpath', basic.realpathPromise);
  patch(fs.promises, promiseDescriptors, 'readlink', basic.readlinkPromise);
  patch(fs.promises, promiseDescriptors, 'opendir', directory.opendirPromise);
  patch(fs.promises, promiseDescriptors, 'open', openPromise);

  guardUnhandledFilesystemOperations(fs, descriptors, FS_NON_OPERATION_EXPORTS, 'fs');
  guardUnhandledFilesystemOperations(
    fs.promises,
    promiseDescriptors,
    new Set(),
    'fs/promises',
    true,
  );

  syncBuiltinESMExports();

  const reset = () => {
    fileDescriptors.clear();
    fileHandles.clear();
  };
  const uninstall = () => {
    for (const [name, savedDescriptor] of descriptors) {
      Object.defineProperty(fs, name, savedDescriptor);
    }
    for (const [name, savedDescriptor] of promiseDescriptors) {
      Object.defineProperty(fs.promises, name, savedDescriptor);
    }
    reset();
    syncBuiltinESMExports();
  };
  return { reset, uninstall };
}

export function installFsCache(options?: ArchiveOptions): FsCacheInstallation {
  const existingInstallation = installations[INSTALLATION];
  if (existingInstallation) {
    if (options) {
      existingInstallation.beginAnalysis(options);
    }
    return existingInstallation;
  }

  const patches = installPatches(activeArchiveFacade);
  const exitListener = () => {
    if (!activeArchive) {
      return;
    }
    try {
      activeArchive.flush();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `Filesystem cache warning: Cannot write filesystem cache archive ${activeArchive.archivePath}: ${message}\n`,
      );
    }
  };
  process.once('exit', exitListener);

  const installation: FsCacheInstallation = {
    get archive() {
      return activeArchive;
    },
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
        archive,
        end() {
          if (ended) {
            return;
          }
          if (activeArchive !== archive) {
            throw new Error('The active filesystem cache analysis changed unexpectedly');
          }
          try {
            archive.flush();
          } finally {
            patches.reset();
            activeArchive = undefined;
            ended = true;
          }
        },
      };
    },
    flush: () => requireActiveArchive().flush(),
    getStatistics: () => requireActiveArchive().getStatistics(),
    uninstall() {
      process.removeListener('exit', exitListener);
      try {
        activeArchive?.flush();
      } finally {
        activeArchive = undefined;
        patches.uninstall();
        delete installations[INSTALLATION];
      }
    },
  };
  installations[INSTALLATION] = installation;
  if (options) {
    installation.beginAnalysis(options);
  }
  return installation;
}
