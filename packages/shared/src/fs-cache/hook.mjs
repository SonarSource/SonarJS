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
import { FsCacheArchive } from './archive.mjs';

const MISSING = Symbol('missing filesystem cache observation');
const INSTALLATION = Symbol.for('sonarjs.filesystemCache.installation');

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
  ].map(name => [name, fs[name].bind(fs)]),
);
originalFs.realpathNative = fs.realpath.native.bind(fs.realpath);
originalFs.realpathSyncNative = fs.realpathSync.native.bind(fs.realpathSync);

const originalPromises = Object.fromEntries(
  ['access', 'lstat', 'open', 'readFile', 'readdir', 'readlink', 'realpath', 'stat'].map(name => [
    name,
    fs.promises[name].bind(fs.promises),
  ]),
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

function success(value) {
  return { ok: true, value };
}

function failure(error) {
  return { ok: false, error: snapshotError(error) };
}

function createExecutor(archive) {
  function replay(input, operation, decode = value => value) {
    if (archive.mode !== 'replay') {
      return MISSING;
    }
    const key = archive.keyFor(input);
    if (key === undefined) {
      return MISSING;
    }
    const outcome = archive.get(key, operation);
    if (outcome === undefined) {
      if (archive.strict) {
        throw cacheMiss(operation, input);
      }
      return MISSING;
    }
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
  const convert = value => (bigint ? BigInt(value) : Number(value));
  const stat = Object.create(fs.Stats.prototype);
  for (const [field, value] of Object.entries(snapshot.fields)) {
    if (value !== undefined) {
      stat[field] = convert(value);
    }
  }
  for (const field of ['atime', 'mtime', 'ctime', 'birthtime']) {
    stat[field] = new Date(Number(snapshot.fields[`${field}Ms`]));
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
  return `${name}:${options?.bigint ? 'bigint' : 'number'}`;
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
  if (dirent.isFile()) return 'file';
  if (dirent.isDirectory()) return 'directory';
  if (dirent.isSymbolicLink()) return 'symbolicLink';
  if (dirent.isBlockDevice()) return 'blockDevice';
  if (dirent.isCharacterDevice()) return 'characterDevice';
  if (dirent.isFIFO()) return 'fifo';
  if (dirent.isSocket()) return 'socket';
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
    buffer: Buffer.isBuffer(value),
    path: archive.encodePortablePath(Buffer.isBuffer(value) ? value.toString() : value),
  };
}

function restorePathResult(value, archive) {
  const restored = archive.decodePortablePath(value.path);
  return value.buffer ? Buffer.from(restored) : restored;
}

function readonlyFlags(flags) {
  if (typeof flags === 'string') {
    return flags === 'r' || flags === 'rs' || flags === 'sr';
  }
  return (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT)) === 0;
}

function readArguments(buffer, args) {
  if (args[0] && typeof args[0] === 'object') {
    return {
      offset: args[0].offset ?? 0,
      length: args[0].length ?? buffer.byteLength,
      position: args[0].position ?? null,
    };
  }
  return { offset: args[0], length: args[1], position: args[2] };
}

function installPatches(archive) {
  const executor = createExecutor(archive);
  const descriptors = new Map();
  const promiseDescriptors = new Map();
  const fileDescriptors = new Map();
  let nextFileDescriptor = 0x3fffffff;

  function patch(target, savedDescriptors, name, value) {
    savedDescriptors.set(name, Object.getOwnPropertyDescriptor(target, name));
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    });
  }

  function readFileSync(input, options) {
    const tracked = typeof input === 'number' ? fileDescriptors.get(input) : undefined;
    if (tracked?.virtual) {
      const remaining = tracked.content.subarray(tracked.position);
      tracked.position = tracked.content.length;
      return returnReadBuffer(remaining, options);
    }
    const buffer = executor.runSync(
      input,
      'readFile',
      () => originalFs.readFileSync(input, withoutEncoding(options)),
      value => value.toString('base64'),
      value => Buffer.from(value, 'base64'),
    );
    return returnReadBuffer(buffer, options);
  }

  async function readFilePromise(input, options) {
    if (input instanceof CachedFileHandle) {
      return input.readFile(options);
    }
    const buffer = await executor.runAsync(
      input,
      'readFile',
      () => originalPromises.readFile(input, withoutEncoding(options)),
      value => value.toString('base64'),
      value => Buffer.from(value, 'base64'),
    );
    return returnReadBuffer(buffer, options);
  }

  function readFile(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    readFilePromise(input, options).then(
      value => callback(null, value),
      error => callback(error),
    );
  }

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

  function makeStatCallback(promiseFunction) {
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

  function pathOperation(name, options) {
    return `${name}:${getEncoding(options) || 'utf8'}`;
  }

  function makeRealpathSync(name, original) {
    return (input, options) =>
      executor.runSync(
        input,
        pathOperation(name, options),
        () => original(input, options),
        value => snapshotPathResult(value, archive),
        value => restorePathResult(value, archive),
      );
  }

  function makeRealpathPromise(name, original) {
    return (input, options) =>
      executor.runAsync(
        input,
        pathOperation(name, options),
        () => original(input, options),
        value => snapshotPathResult(value, archive),
        value => restorePathResult(value, archive),
      );
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

  class CachedDir {
    constructor(dirPath, entries) {
      this.path = pathDisplay(dirPath);
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
        return;
      }
      return Promise.resolve().then(operation);
    }

    readSync() {
      if (this.closed) {
        const error = new Error('Directory handle was closed');
        error.code = 'ERR_DIR_CLOSED';
        throw error;
      }
      return this.entries[this.index++] || null;
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
        return;
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

    *[Symbol.iterator]() {
      let entry;
      while ((entry = this.readSync()) !== null) yield entry;
    }

    async *[Symbol.asyncIterator]() {
      let entry;
      while ((entry = this.readSync()) !== null) yield entry;
    }

    async [Symbol.asyncDispose]() {
      if (!this.closed) await this.close();
    }

    [Symbol.dispose]() {
      if (!this.closed) this.closeSync();
    }
  }

  function opendirOptions(options) {
    return {
      encoding: typeof options === 'string' ? options : options?.encoding,
      withFileTypes: true,
    };
  }

  function opendirSync(input, options) {
    const entries = executor.runSync(
      input,
      `opendir:${getEncoding(options) || 'utf8'}`,
      () => originalFs.readdirSync(input, opendirOptions(options)),
      value => snapshotDirectoryResult(value, archive),
      value => restoreDirectoryResult(value, archive),
    );
    return new CachedDir(input, entries);
  }

  async function opendirPromise(input, options) {
    const entries = await executor.runAsync(
      input,
      `opendir:${getEncoding(options) || 'utf8'}`,
      () => originalPromises.readdir(input, opendirOptions(options)),
      value => snapshotDirectoryResult(value, archive),
      value => restoreDirectoryResult(value, archive),
    );
    return new CachedDir(input, entries);
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

  function captureOpenedFile(input, fd) {
    const key = archive.keyFor(input);
    if (key === undefined || archive.mode !== 'record') {
      return;
    }
    try {
      const content = originalFs.readFileSync(input);
      archive.set(key, 'readFile', success(content.toString('base64')));
    } catch {
      // A directory can be opened successfully but cannot be captured as file content.
    }
    try {
      archive.set(key, 'fstat:number', success(snapshotStat(originalFs.fstatSync(fd))));
    } catch {
      // The original open already succeeded; auxiliary capture must not alter its result.
    }
  }

  function replayOpen(input, operation) {
    if (archive.mode !== 'replay') return MISSING;
    const key = archive.keyFor(input);
    if (key === undefined) return MISSING;
    const outcome = archive.get(key, operation);
    if (outcome === undefined) {
      if (archive.strict) throw cacheMiss(operation, input);
      return MISSING;
    }
    if (!outcome.ok) throw restoreError(outcome.error, input);
    const file = archive.get(key, 'readFile');
    if (!file?.ok) {
      if (archive.strict) throw cacheMiss('readFile', input);
      return MISSING;
    }
    const fd = nextFileDescriptor--;
    fileDescriptors.set(fd, {
      content: Buffer.from(file.value, 'base64'),
      key,
      position: 0,
      virtual: true,
    });
    return fd;
  }

  function openSync(input, flags, mode) {
    if (!readonlyFlags(flags)) {
      return originalFs.openSync(input, flags, mode);
    }
    const operation = `open:${String(flags)}`;
    const key = archive.keyFor(input);
    const replayed = replayOpen(input, operation);
    if (replayed !== MISSING) return replayed;

    try {
      const fd = originalFs.openSync(input, flags, mode);
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, success(null));
        captureOpenedFile(input, fd);
        fileDescriptors.set(fd, { key, position: 0, virtual: false });
      }
      return fd;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  function open(input, flags, mode, callback) {
    if (typeof mode === 'function') {
      callback = mode;
      mode = undefined;
    }
    try {
      const key = archive.keyFor(input);
      if (readonlyFlags(flags) && archive.mode === 'replay' && key !== undefined) {
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
        const operation = `open:${String(flags)}`;
        archive.set(key, operation, error ? failure(error) : success(null));
        if (!error) {
          captureOpenedFile(input, fd);
          fileDescriptors.set(fd, { key, position: 0, virtual: false });
        }
      }
      callback(error, fd);
    });
  }

  function readVirtual(fd, buffer, args) {
    const tracked = fileDescriptors.get(fd);
    if (!tracked?.virtual) return undefined;
    const { offset, length, position } = readArguments(buffer, args);
    const start = position === null || position === undefined ? tracked.position : position;
    const bytesRead = tracked.content.copy(buffer, offset, start, start + length);
    if (position === null || position === undefined) tracked.position += bytesRead;
    return bytesRead;
  }

  function readSync(fd, buffer, ...args) {
    return readVirtual(fd, buffer, args) ?? originalFs.readSync(fd, buffer, ...args);
  }

  function read(fd, buffer, ...args) {
    const callback = args.pop();
    const bytesRead = readVirtual(fd, buffer, args);
    if (bytesRead !== undefined) {
      queueMicrotask(() => callback(null, bytesRead, buffer));
      return;
    }
    originalFs.read(fd, buffer, ...args, callback);
  }

  function fstatSync(fd, options) {
    const tracked = fileDescriptors.get(fd);
    if (!tracked?.virtual) return originalFs.fstatSync(fd, options);
    const outcome =
      archive.get(tracked.key, statOperation('fstat', options)) ||
      archive.get(tracked.key, 'fstat:number');
    if (!outcome?.ok) throw cacheMiss('fstat', tracked.key);
    return restoreStat(outcome.value, options?.bigint);
  }

  function fstat(fd, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const tracked = fileDescriptors.get(fd);
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
    fileDescriptors.delete(fd);
    if (!tracked?.virtual) originalFs.closeSync(fd);
  }

  function close(fd, callback) {
    const tracked = fileDescriptors.get(fd);
    fileDescriptors.delete(fd);
    if (tracked?.virtual) {
      queueMicrotask(() => callback(null));
    } else {
      originalFs.close(fd, callback);
    }
  }

  class CachedFileHandle {
    constructor(fd) {
      this.fd = fd;
    }

    async read(buffer, ...args) {
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

  async function openPromise(input, flags, mode) {
    const operation = `open:${String(flags)}`;
    if (readonlyFlags(flags)) {
      const replayed = replayOpen(input, operation);
      if (replayed !== MISSING) return new CachedFileHandle(replayed);
    }
    const key = archive.keyFor(input);
    try {
      const handle = await originalPromises.open(input, flags, mode);
      if (archive.mode === 'record' && key !== undefined && readonlyFlags(flags)) {
        archive.set(key, operation, success(null));
        captureOpenedFile(input, handle.fd);
      }
      return handle;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined && readonlyFlags(flags)) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
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

  patch(fs, descriptors, 'readFileSync', readFileSync);
  patch(fs, descriptors, 'readFile', readFile);
  patch(fs, descriptors, 'readdirSync', readdirSync);
  patch(fs, descriptors, 'readdir', readdir);
  patch(fs, descriptors, 'existsSync', existsSync);
  patch(fs, descriptors, 'exists', exists);
  patch(fs, descriptors, 'accessSync', accessSync);
  patch(fs, descriptors, 'access', access);
  patch(fs, descriptors, 'statSync', statSync);
  patch(fs, descriptors, 'stat', makeStatCallback(statPromise));
  patch(fs, descriptors, 'lstatSync', lstatSync);
  patch(fs, descriptors, 'lstat', makeStatCallback(lstatPromise));
  patch(fs, descriptors, 'realpathSync', realpathSync);
  patch(fs, descriptors, 'realpath', realpath);
  patch(fs, descriptors, 'readlinkSync', readlinkSync);
  patch(fs, descriptors, 'readlink', makeCallback(readlinkPromise));
  patch(fs, descriptors, 'opendirSync', opendirSync);
  patch(fs, descriptors, 'opendir', opendir);
  patch(fs, descriptors, 'openSync', openSync);
  patch(fs, descriptors, 'open', open);
  patch(fs, descriptors, 'readSync', readSync);
  patch(fs, descriptors, 'read', read);
  patch(fs, descriptors, 'fstatSync', fstatSync);
  patch(fs, descriptors, 'fstat', fstat);
  patch(fs, descriptors, 'closeSync', closeSync);
  patch(fs, descriptors, 'close', close);

  patch(fs.promises, promiseDescriptors, 'readFile', readFilePromise);
  patch(fs.promises, promiseDescriptors, 'readdir', readdirPromise);
  patch(fs.promises, promiseDescriptors, 'access', accessPromise);
  patch(fs.promises, promiseDescriptors, 'stat', statPromise);
  patch(fs.promises, promiseDescriptors, 'lstat', lstatPromise);
  patch(fs.promises, promiseDescriptors, 'realpath', realpathPromise);
  patch(fs.promises, promiseDescriptors, 'readlink', readlinkPromise);
  patch(fs.promises, promiseDescriptors, 'opendir', opendirPromise);
  patch(fs.promises, promiseDescriptors, 'open', openPromise);

  syncBuiltinESMExports();

  return () => {
    for (const [name, descriptor] of descriptors) Object.defineProperty(fs, name, descriptor);
    for (const [name, descriptor] of promiseDescriptors) {
      Object.defineProperty(fs.promises, name, descriptor);
    }
    fileDescriptors.clear();
    syncBuiltinESMExports();
  };
}

export function installFsCache(options) {
  if (globalThis[INSTALLATION]) {
    return globalThis[INSTALLATION];
  }

  const archive = new FsCacheArchive(options);
  archive.load();
  const uninstallPatches = installPatches(archive);
  const exitListener = () => archive.flush();
  process.once('exit', exitListener);

  const installation = {
    archive,
    flush: () => archive.flush(),
    uninstall() {
      process.removeListener('exit', exitListener);
      archive.flush();
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
  });
}

export function getFsCacheInstallation() {
  return globalThis[INSTALLATION];
}
