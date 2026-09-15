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
import { createFsCacheArchive } from './archive-factory.mjs';

const MISSING = Symbol('missing filesystem cache observation');
const INSTALLATION = Symbol.for('sonarjs.filesystemCache.installation');
const CACHED_FILE_HANDLE = Symbol('cached filesystem file handle');
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

const originalFs = Object.fromEntries(
  [
    'access',
    'accessSync',
    'close',
    'closeSync',
    'existsSync',
    'fstat',
    'fstatSync',
    'lstat',
    'lstatSync',
    'open',
    'openSync',
    'opendir',
    'opendirSync',
    'read',
    'readFile',
    'readFileSync',
    'readSync',
    'readdir',
    'readdirSync',
    'readlink',
    'readlinkSync',
    'realpath',
    'realpathSync',
    'stat',
    'statSync',
    'writeSync',
  ].map(name => [name, fs[name].bind(fs)]),
);
originalFs.realpathNative = fs.realpath.native.bind(fs.realpath);
originalFs.realpathSyncNative = fs.realpathSync.native.bind(fs.realpathSync);

const originalPromises = Object.fromEntries(
  ['access', 'lstat', 'open', 'opendir', 'readFile', 'readdir', 'readlink', 'realpath', 'stat'].map(
    name => [name, fs.promises[name].bind(fs.promises)],
  ),
);

function pathDisplay(input) {
  if (Buffer.isBuffer(input)) {
    return input.toString();
  }
  return String(input);
}

function snapshotError(error) {
  const errorPath = error?.path === undefined ? undefined : pathDisplay(error.path);
  return {
    name: error?.name || 'Error',
    message: String(error?.message || error).replaceAll(errorPath || '\0', '$PATH'),
    code: error?.code,
    errno: error?.errno,
    syscall: error?.syscall,
  };
}

function restoreError(snapshot, input) {
  const currentPath = pathDisplay(input);
  const error = new Error(snapshot.message.replaceAll('$PATH', currentPath));
  error.name = snapshot.name;
  error.code = snapshot.code;
  error.errno = snapshot.errno;
  error.syscall = snapshot.syscall;
  error.path = currentPath;
  return error;
}

function cacheMiss(operation, input) {
  const error = new Error(
    `Filesystem cache has no ${operation} observation for '${pathDisplay(input)}'`,
  );
  error.name = 'FsCacheMissError';
  error.code = 'ERR_SONARJS_FS_CACHE_MISS';
  error.path = pathDisplay(input);
  error.syscall = operation.split(':', 1)[0];
  return error;
}

function missingPath(operation, input) {
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
  const error = new Error(`ENOENT: no such file or directory, ${syscall} '${currentPath}'`);
  error.code = 'ENOENT';
  error.errno = ENOENT_ERRNO;
  error.path = currentPath;
  error.syscall = syscall;
  throw error;
}

function success(value) {
  return { ok: true, value };
}

function failure(error) {
  return { ok: false, error: snapshotError(error) };
}

function createExecutor(archive) {
  function replay(input, operation, decode = value => value) {
    const key = archive.keyFor(input);
    if (key === undefined) {
      return MISSING;
    }
    const outcome = archive.get(key, operation);
    if (outcome === undefined) {
      if (archive.getExists(key, operation) === false) {
        archive.recordCacheHit();
        return missingPath(operation, input);
      }
      archive.recordCacheMiss();
      if (archive.mode === 'replay' && archive.strict) {
        throw cacheMiss(operation, input);
      }
      return MISSING;
    }
    archive.recordCacheHit();
    if (!outcome.ok) {
      throw restoreError(outcome.error, input);
    }
    return decode(outcome.value);
  }

  function runSync(input, operation, producer, encode = value => value, decode = value => value) {
    const replayed = replay(input, operation, decode);
    if (replayed !== MISSING) {
      return replayed;
    }

    const key = archive.keyFor(input);
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

  async function runAsync(
    input,
    operation,
    producer,
    encode = value => value,
    decode = value => value,
  ) {
    const replayed = replay(input, operation, decode);
    if (replayed !== MISSING) {
      return replayed;
    }

    const key = archive.keyFor(input);
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

function getEncoding(options) {
  if (typeof options === 'string') {
    return options;
  }
  return options?.encoding || undefined;
}

function withoutEncoding(options) {
  if (typeof options === 'string') {
    return null;
  }
  return options && typeof options === 'object' ? { ...options, encoding: null } : options;
}

function returnReadBuffer(buffer, options) {
  const encoding = getEncoding(options);
  return encoding ? buffer.toString(encoding) : Buffer.from(buffer);
}

function restoreContent(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, 'base64');
}

function snapshotStat(stat) {
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
  ];
  return {
    fields: Object.fromEntries(
      fields.map(field => [field, stat[field] === undefined ? undefined : String(stat[field])]),
    ),
    types: {
      blockDevice: stat.isBlockDevice(),
      characterDevice: stat.isCharacterDevice(),
      directory: stat.isDirectory(),
      fifo: stat.isFIFO(),
      file: stat.isFile(),
      socket: stat.isSocket(),
      symbolicLink: stat.isSymbolicLink(),
    },
  };
}

function restoreStat(snapshot, bigint = false) {
  const stat = Object.create(fs.Stats.prototype);
  for (const [field, value] of Object.entries(snapshot.fields)) {
    if (value !== undefined) {
      if (bigint) {
        stat[field] = /^-?\d+$/.test(value) ? BigInt(value) : BigInt(Math.trunc(Number(value)));
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
  stat.isBlockDevice = () => snapshot.types.blockDevice;
  stat.isCharacterDevice = () => snapshot.types.characterDevice;
  stat.isDirectory = () => snapshot.types.directory;
  stat.isFIFO = () => snapshot.types.fifo;
  stat.isFile = () => snapshot.types.file;
  stat.isSocket = () => snapshot.types.socket;
  stat.isSymbolicLink = () => snapshot.types.symbolicLink;
  return stat;
}

function statOperation(name, options) {
  const result = options?.throwIfNoEntry === false ? 'soft' : 'throw';
  return `${name}:${options?.bigint ? 'bigint' : 'number'}:${result}`;
}

function snapshotName(name) {
  return Buffer.isBuffer(name)
    ? { kind: 'buffer', value: name.toString('base64') }
    : { kind: 'string', value: name };
}

function restoreName(name) {
  return name.kind === 'buffer' ? Buffer.from(name.value, 'base64') : name.value;
}

function direntType(dirent) {
  if (dirent.isFile()) {
    return 'file';
  }
  if (dirent.isDirectory()) {
    return 'directory';
  }
  if (dirent.isSymbolicLink()) {
    return 'symbolicLink';
  }
  if (dirent.isBlockDevice()) {
    return 'blockDevice';
  }
  if (dirent.isCharacterDevice()) {
    return 'characterDevice';
  }
  if (dirent.isFIFO()) {
    return 'fifo';
  }
  if (dirent.isSocket()) {
    return 'socket';
  }
  return 'unknown';
}

function snapshotDirectoryResult(result, archive) {
  return result.map(entry => {
    if (typeof entry === 'string' || Buffer.isBuffer(entry)) {
      return { kind: 'name', name: snapshotName(entry) };
    }
    return {
      kind: 'dirent',
      name: snapshotName(entry.name),
      type: direntType(entry),
      parentPath: archive.encodePortablePath(entry.parentPath || entry.path || ''),
    };
  });
}

function createDirent(snapshot, archive) {
  const dirent = Object.create(fs.Dirent.prototype);
  dirent.name = restoreName(snapshot.name);
  dirent.parentPath = archive.decodePortablePath(snapshot.parentPath);
  dirent.path = dirent.parentPath;
  for (const [method, type] of [
    ['isBlockDevice', 'blockDevice'],
    ['isCharacterDevice', 'characterDevice'],
    ['isDirectory', 'directory'],
    ['isFIFO', 'fifo'],
    ['isFile', 'file'],
    ['isSocket', 'socket'],
    ['isSymbolicLink', 'symbolicLink'],
  ]) {
    dirent[method] = () => snapshot.type === type;
  }
  return dirent;
}

function restoreDirectoryResult(result, archive) {
  return result.map(entry =>
    entry.kind === 'name' ? restoreName(entry.name) : createDirent(entry, archive),
  );
}

function readdirOperation(options) {
  const normalized = typeof options === 'string' ? { encoding: options } : options || {};
  return `readdir:${normalized.encoding || 'utf8'}:${Boolean(normalized.withFileTypes)}:${Boolean(normalized.recursive)}`;
}

function snapshotPathResult(value, archive) {
  return {
    path: archive.encodePortablePath(value.toString()),
  };
}

function restorePathResult(value, archive) {
  return Buffer.from(archive.decodePortablePath(value.path));
}

function withBufferEncoding(options) {
  return options && typeof options === 'object' ? { ...options, encoding: 'buffer' } : 'buffer';
}

function returnPathBuffer(value, options) {
  const encoding = getEncoding(options) || 'utf8';
  return encoding === 'buffer' ? Buffer.from(value) : value.toString(encoding);
}

function readonlyFlags(flags) {
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

function openOperation(flags) {
  if (flags === undefined || flags === 'r' || flags === fs.constants.O_RDONLY) {
    return 'open:r';
  }
  return `open:${String(flags)}`;
}

function readArguments(buffer, args) {
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

function makeCallback(promiseFunction) {
  return (input, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    promiseFunction(input, options).then(
      value => callback(null, value),
      error => callback(error),
    );
  };
}

function pathOperation(name, options) {
  return name.startsWith('realpath') ? name : `${name}:${getEncoding(options) || 'utf8'}`;
}

function opendirOperation(options) {
  return `opendir:${getEncoding(options) || 'utf8'}:${Boolean(options?.recursive)}`;
}

function patch(target, savedDescriptors, name, value) {
  savedDescriptors.set(name, Object.getOwnPropertyDescriptor(target, name));
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function unsupportedFilesystemOperation(moduleName, name) {
  const error = new Error(
    `Filesystem cache does not support ${moduleName}.${name} from Node ${process.version}`,
  );
  error.name = 'UnsupportedFsOperationError';
  error.code = 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION';
  return error;
}

function guardUnhandledFilesystemOperations(
  target,
  savedDescriptors,
  nonOperations,
  moduleName,
  reject = false,
) {
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
    if (savedDescriptors.has(name) || nonOperations.has(name)) {
      continue;
    }
    const value = typeof descriptor.get === 'function' ? target[name] : descriptor.value;
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

function createReadFilePatches(executor, fileDescriptors, fileHandles) {
  function readFileSync(input, options) {
    const tracked = typeof input === 'number' ? fileDescriptors.get(input) : undefined;
    if (typeof input === 'number' && !tracked) {
      throw unsupportedFilesystemOperation('fs', 'readFileSync with an unknown descriptor');
    }
    if (tracked?.virtual) {
      if (tracked.readError) {
        throw restoreError(tracked.readError, tracked.input);
      }
      const remaining = tracked.content.subarray(tracked.position);
      tracked.position = tracked.content.length;
      return returnReadBuffer(remaining, options);
    }
    const buffer = executor.runSync(
      input,
      'readFile',
      () => originalFs.readFileSync(input, withoutEncoding(options)),
      value => value.toString('base64'),
      restoreContent,
    );
    return returnReadBuffer(buffer, options);
  }

  async function readFilePromise(input, options) {
    if (input?.[CACHED_FILE_HANDLE]) {
      return input.readFile(options);
    }
    if (typeof input?.fd === 'number' && !fileHandles.has(input)) {
      throw unsupportedFilesystemOperation('fs/promises', 'readFile with an unknown FileHandle');
    }
    const buffer = await executor.runAsync(
      input,
      'readFile',
      () => originalPromises.readFile(input, withoutEncoding(options)),
      value => value.toString('base64'),
      restoreContent,
    );
    return returnReadBuffer(buffer, options);
  }

  function readFile(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const tracked = typeof input === 'number' ? fileDescriptors.get(input) : undefined;
    if (typeof input === 'number' && !tracked) {
      throw unsupportedFilesystemOperation('fs', 'readFile with an unknown descriptor');
    }
    if (typeof input === 'number' && !tracked.virtual) {
      originalFs.readFile(input, options, callback);
    } else {
      const result = tracked?.virtual
        ? Promise.resolve().then(() => readFileSync(input, options))
        : readFilePromise(input, options);
      result.then(
        value => callback(null, value),
        error => callback(error),
      );
    }
  }

  return { readFile, readFilePromise, readFileSync };
}

function createBasicPatches(archive, executor) {
  function makeStatSync(name, original) {
    return (input, options) =>
      executor.runSync(
        input,
        statOperation(name, options),
        () => original(input, options),
        value => (value === undefined ? null : snapshotStat(value)),
        value => (value === null ? undefined : restoreStat(value, options?.bigint)),
      );
  }

  function makeStatPromise(name, original) {
    return (input, options) =>
      executor.runAsync(
        input,
        statOperation(name, options),
        () => original(input, options),
        snapshotStat,
        value => restoreStat(value, options?.bigint),
      );
  }

  function readdirSync(input, options) {
    return executor.runSync(
      input,
      readdirOperation(options),
      () => originalFs.readdirSync(input, options),
      value => snapshotDirectoryResult(value, archive),
      value => restoreDirectoryResult(value, archive),
    );
  }

  function readdirPromise(input, options) {
    return executor.runAsync(
      input,
      readdirOperation(options),
      () => originalPromises.readdir(input, options),
      value => snapshotDirectoryResult(value, archive),
      value => restoreDirectoryResult(value, archive),
    );
  }

  function readdir(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    readdirPromise(input, options).then(
      value => callback(null, value),
      error => callback(error),
    );
  }

  function existsSync(input) {
    return executor.runSync(input, 'exists', () => originalFs.existsSync(input));
  }

  function exists(input, callback) {
    let result;
    try {
      result = existsSync(input);
    } catch {
      result = false;
    }
    queueMicrotask(() => callback(result));
  }

  function accessPromise(input, mode = fs.constants.F_OK) {
    return executor.runAsync(input, `access:${mode}`, () => originalPromises.access(input, mode));
  }

  function access(input, mode, callback) {
    if (typeof mode === 'function') {
      callback = mode;
      mode = fs.constants.F_OK;
    }
    accessPromise(input, mode).then(
      () => callback(null),
      error => callback(error),
    );
  }

  function accessSync(input, mode = fs.constants.F_OK) {
    return executor.runSync(input, `access:${mode}`, () => originalFs.accessSync(input, mode));
  }

  function makeRealpathSync(name, original) {
    return (input, options) => {
      const value = executor.runSync(
        input,
        pathOperation(name, options),
        () => original(input, withBufferEncoding(options)),
        value => snapshotPathResult(value, archive),
        value => restorePathResult(value, archive),
      );
      return returnPathBuffer(value, options);
    };
  }

  function makeRealpathPromise(name, original) {
    return async (input, options) => {
      const value = await executor.runAsync(
        input,
        pathOperation(name, options),
        () => original(input, withBufferEncoding(options)),
        value => snapshotPathResult(value, archive),
        value => restorePathResult(value, archive),
      );
      return returnPathBuffer(value, options);
    };
  }

  function readlinkSync(input, options) {
    return executor.runSync(
      input,
      pathOperation('readlink', options),
      () => originalFs.readlinkSync(input, options),
      snapshotName,
      restoreName,
    );
  }

  function readlinkPromise(input, options) {
    return executor.runAsync(
      input,
      pathOperation('readlink', options),
      () => originalPromises.readlink(input, options),
      snapshotName,
      restoreName,
    );
  }

  const statSync = makeStatSync('stat', originalFs.statSync);
  const lstatSync = makeStatSync('lstat', originalFs.lstatSync);
  const statPromise = makeStatPromise('stat', originalPromises.stat);
  const lstatPromise = makeStatPromise('lstat', originalPromises.lstat);
  const realpathSync = makeRealpathSync('realpath', originalFs.realpathSync);
  realpathSync.native = makeRealpathSync('realpath.native', originalFs.realpathSyncNative);
  const realpathPromise = makeRealpathPromise('realpath', originalPromises.realpath);
  const realpath = makeCallback(realpathPromise);
  realpath.native = makeCallback(
    makeRealpathPromise(
      'realpath.native',
      (input, options) =>
        new Promise((resolve, reject) =>
          originalFs.realpathNative(input, options, (error, value) =>
            error ? reject(error) : resolve(value),
          ),
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
  constructor(dirPath, entries) {
    Object.defineProperty(this, 'path', {
      configurable: true,
      enumerable: true,
      value: pathDisplay(dirPath),
    });
    this.entries = entries;
    this.index = 0;
    this.closed = false;
  }

  read(callback) {
    const operation = () => this.readSync();
    if (callback) {
      try {
        const entry = operation();
        queueMicrotask(() => callback(null, entry));
      } catch (error) {
        queueMicrotask(() => callback(error));
      }
      return undefined;
    }
    return Promise.resolve().then(operation);
  }

  readSync() {
    if (this.closed) {
      const error = new Error('Directory handle was closed');
      error.code = 'ERR_DIR_CLOSED';
      throw error;
    }
    const entry = this.entries[this.index] || null;
    this.index += 1;
    return entry;
  }

  close(callback) {
    const operation = () => this.closeSync();
    if (callback) {
      try {
        operation();
        queueMicrotask(() => callback(null));
      } catch (error) {
        queueMicrotask(() => callback(error));
      }
      return undefined;
    }
    return Promise.resolve().then(operation);
  }

  closeSync() {
    if (this.closed) {
      const error = new Error('Directory handle was closed');
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

function readDirectoryWithOpendirSync(input, options) {
  const directory = originalFs.opendirSync(input, options);
  try {
    const entries = [];
    let entry;
    while ((entry = directory.readSync()) !== null) {
      entries.push(entry);
    }
    return entries;
  } finally {
    directory.closeSync();
  }
}

async function readDirectoryWithOpendir(input, options) {
  const directory = await originalPromises.opendir(input, options);
  try {
    const entries = [];
    let entry;
    while ((entry = await directory.read()) !== null) {
      entries.push(entry);
    }
    return entries;
  } finally {
    await directory.close();
  }
}

function createDirectoryPatches(archive, executor) {
  function opendirSync(input, options) {
    const operation = opendirOperation(options);
    const replayed = executor.replay(input, operation, value =>
      restoreDirectoryResult(value, archive),
    );
    if (replayed !== MISSING) {
      return new CachedDir(input, replayed);
    }

    const key = archive.keyFor(input);
    try {
      const directory = originalFs.opendirSync(input, options);
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

  async function opendirPromise(input, options) {
    const operation = opendirOperation(options);
    const replayed = executor.replay(input, operation, value =>
      restoreDirectoryResult(value, archive),
    );
    if (replayed !== MISSING) {
      return new CachedDir(input, replayed);
    }

    const key = archive.keyFor(input);
    try {
      const directory = await originalPromises.opendir(input, options);
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

  function opendir(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    opendirPromise(input, options).then(
      value => callback(null, value),
      error => callback(error),
    );
  }

  return { opendir, opendirPromise, opendirSync };
}

function createOpenPatches(archive, fileDescriptors) {
  let nextFileDescriptor = 0x3fffffff;

  function captureOpenedFile(input, fd) {
    const key = archive.keyFor(input);
    if (key === undefined || archive.mode !== 'record') {
      return;
    }
    if (archive.get(key, 'readFile') === undefined) {
      try {
        const chunks = [];
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
        archive.set(key, 'readFile', success(content.toString('base64')));
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

  function replayOpen(input, operation) {
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
      if (archive.mode === 'replay' && archive.strict) {
        throw cacheMiss(operation, input);
      }
      return { found: false };
    }
    archive.recordCacheHit();
    if (!outcome.ok) {
      throw restoreError(outcome.error, input);
    }
    const file = archive.get(key, 'readFile');
    if (file === undefined) {
      if (archive.mode === 'replay' && archive.strict) {
        throw cacheMiss('readFile', input);
      }
      return { found: false };
    }
    const fd = nextFileDescriptor;
    nextFileDescriptor -= 1;
    fileDescriptors.set(fd, {
      content: file.ok ? restoreContent(file.value) : undefined,
      input: pathDisplay(input),
      key,
      position: 0,
      readError: file.ok ? undefined : file.error,
      virtual: true,
    });
    return { fd, found: true };
  }

  function openSync(input, flags, mode) {
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

  function open(input, flags, mode, callback) {
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
        queueMicrotask(() => callback(null, fd));
        return;
      }
    } catch (error) {
      queueMicrotask(() => callback(error));
      return;
    }

    originalFs.open(input, flags, mode, (error, fd) => {
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
      callback(error, fd);
    });
  }

  return { captureOpenedFile, open, openSync, replayOpen };
}

function createDescriptorPatches(archive, fileDescriptors, readFileSync) {
  function readVirtual(fd, buffer, args) {
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
    const start = Math.max(0, Math.min(tracked.content.length, requestedStart));
    const end = Math.min(tracked.content.length, start + Number(length));
    const bytesRead = tracked.content.copy(buffer, offset, start, Math.max(start, end));
    if (sequential) {
      tracked.position = start + bytesRead;
    }
    return bytesRead;
  }

  function readSync(fd, buffer, ...args) {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'readSync with an unknown descriptor');
    }
    return readVirtual(fd, buffer, args) ?? originalFs.readSync(fd, buffer, ...args);
  }

  function read(fd, ...args) {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'read with an unknown descriptor');
    }
    if (!tracked.virtual) {
      originalFs.read(fd, ...args);
    } else {
      const callback = args.pop();
      let buffer;
      let readArgs;
      if (ArrayBuffer.isView(args[0])) {
        [buffer] = args;
        readArgs = args.slice(1);
      } else {
        const options = args[0] || {};
        buffer = options.buffer || Buffer.alloc(16_384);
        readArgs = [options];
      }
      try {
        const bytesRead = readVirtual(fd, buffer, readArgs);
        queueMicrotask(() => callback(null, bytesRead, buffer));
      } catch (error) {
        queueMicrotask(() => callback(error, 0, buffer));
      }
    }
  }

  function fstatSync(fd, options) {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'fstatSync with an unknown descriptor');
    }
    if (!tracked.virtual) {
      return originalFs.fstatSync(fd, options);
    }
    const outcome = archive.get(tracked.key, statOperation('fstat', options));
    if (!outcome?.ok) {
      throw cacheMiss('fstat', tracked.key);
    }
    return restoreStat(outcome.value, options?.bigint);
  }

  function fstat(fd, options, callback) {
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
        queueMicrotask(() => callback(null, stat));
      } catch (error) {
        queueMicrotask(() => callback(error));
      }
      return;
    }
    originalFs.fstat(fd, options, callback);
  }

  function closeSync(fd) {
    const tracked = fileDescriptors.get(fd);
    if (!tracked) {
      throw unsupportedFilesystemOperation('fs', 'closeSync with an unknown descriptor');
    }
    fileDescriptors.delete(fd);
    if (!tracked?.virtual) {
      originalFs.closeSync(fd);
    }
  }

  function close(fd, callback) {
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
    constructor(fd) {
      this.fd = fd;
      this[CACHED_FILE_HANDLE] = true;
    }

    async read(buffer, ...args) {
      if (!ArrayBuffer.isView(buffer)) {
        const options = buffer ?? {};
        const target = options.buffer ?? Buffer.alloc(16_384);
        return { bytesRead: readVirtual(this.fd, target, [options]), buffer: target };
      }
      return { bytesRead: readVirtual(this.fd, buffer, args), buffer };
    }

    async readFile(options) {
      return readFileSync(this.fd, options);
    }

    async stat(options) {
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

function createOpenPromise(archive, fileDescriptors, fileHandles, openPatches, CachedFileHandle) {
  const { captureOpenedFile, replayOpen } = openPatches;

  async function openPromise(input, flags, mode) {
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

function installPatches(archive) {
  const executor = createExecutor(archive);
  const descriptors = new Map();
  const promiseDescriptors = new Map();
  const fileDescriptors = new Map();
  const fileHandles = new WeakSet();
  const readFile = createReadFilePatches(executor, fileDescriptors, fileHandles);
  const basic = createBasicPatches(archive, executor);
  const directory = createDirectoryPatches(archive, executor);
  const openPatches = createOpenPatches(archive, fileDescriptors);
  const descriptor = createDescriptorPatches(archive, fileDescriptors, readFile.readFileSync);
  const openPromise = createOpenPromise(
    archive,
    fileDescriptors,
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
  patch(fs, descriptors, 'writeSync', (fd, ...args) => {
    if (fd !== 1 && fd !== 2) {
      throw unsupportedFilesystemOperation('fs', 'writeSync outside stdout or stderr');
    }
    return originalFs.writeSync(fd, ...args);
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

  return () => {
    for (const [name, savedDescriptor] of descriptors) {
      Object.defineProperty(fs, name, savedDescriptor);
    }
    for (const [name, savedDescriptor] of promiseDescriptors) {
      Object.defineProperty(fs.promises, name, savedDescriptor);
    }
    fileDescriptors.clear();
    syncBuiltinESMExports();
  };
}

export function installFsCache(options) {
  if (globalThis[INSTALLATION]) {
    return globalThis[INSTALLATION];
  }

  const archive = createFsCacheArchive(options);
  if (archive.mode === 'replay') {
    archive.load();
  }
  const uninstallPatches = installPatches(archive);
  const exitListener = () => {
    try {
      archive.flush();
    } catch (error) {
      process.stderr.write(
        `Filesystem cache warning: Cannot write filesystem cache archive ${archive.archivePath}: ${error?.message ?? error}\n`,
      );
    } finally {
      archive.close?.();
    }
  };
  process.once('exit', exitListener);

  const installation = {
    archive,
    flush: () => archive.flush(),
    getStatistics: () => archive.getStatistics(),
    uninstall() {
      process.removeListener('exit', exitListener);
      archive.flush();
      archive.close?.();
      uninstallPatches();
      delete globalThis[INSTALLATION];
    },
  };
  globalThis[INSTALLATION] = installation;
  return installation;
}

export function installFsCacheFromEnvironment(environment = process.env) {
  const mode = environment.SONARJS_FS_CACHE_MODE;
  if (!mode) {
    throw new Error('SONARJS_FS_CACHE_MODE must be set to record or replay');
  }
  return installFsCache({
    mode,
    archivePath: environment.SONARJS_FS_CACHE_ARCHIVE,
    rootDir: environment.SONARJS_FS_CACHE_ROOT,
    strict: environment.SONARJS_FS_CACHE_STRICT === '1',
    analyzerVersion: environment.SONARJS_FS_CACHE_ANALYZER_VERSION,
    archiveBackend: environment.SONARJS_FS_CACHE_ARCHIVE_BACKEND,
    diskMemoryLimitMb: environment.SONARJS_FS_CACHE_DISK_MEMORY_LIMIT_MB,
  });
}

export function getFsCacheInstallation() {
  return globalThis[INSTALLATION];
}
