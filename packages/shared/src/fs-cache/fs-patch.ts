/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import type { Stats, StatOptions, StatSyncOptions, Dirent, Dir } from 'node:fs';
import { getFsCacheManager } from './cache-manager.js';
import type { FsChildEntry, FsNodeStat } from './cache-types.js';

// Store original functions before patching
const originalFs = {
  readFileSync: fs.readFileSync.bind(fs),
  readdirSync: fs.readdirSync.bind(fs),
  statSync: fs.statSync.bind(fs),
  lstatSync: fs.lstatSync.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  realpathSync: fs.realpathSync.bind(fs),
  realpathSyncNative: fs.realpathSync.native.bind(fs),
  accessSync: fs.accessSync.bind(fs),
  opendirSync: fs.opendirSync.bind(fs),
};

const originalFsPromises = {
  readFile: fs.promises.readFile.bind(fs.promises),
  readdir: fs.promises.readdir.bind(fs.promises),
  stat: fs.promises.stat.bind(fs.promises),
  lstat: fs.promises.lstat.bind(fs.promises),
  realpath: fs.promises.realpath.bind(fs.promises),
  access: fs.promises.access.bind(fs.promises),
  opendir: fs.promises.opendir.bind(fs.promises),
};

let isPatched = false;

/**
 * Creates an ENOENT error.
 */
function createEnoentError(syscall: string, path: string): NodeJS.ErrnoException {
  const err = new Error(
    `ENOENT: no such file or directory, ${syscall} '${path}'`,
  ) as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  err.errno = -2;
  err.syscall = syscall;
  err.path = path;
  return err;
}

/**
 * Extracts stat data from fs.Stats for caching.
 */
function extractStatsData(stats: Stats): FsNodeStat {
  return {
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    isSymbolicLink: stats.isSymbolicLink(),
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    mode: stats.mode,
  };
}

/**
 * Creates a Stats-like object from cached data.
 */
function createStatsFromCache(data: FsNodeStat): Stats {
  const stats = Object.create(fs.Stats.prototype) as Stats;

  Object.assign(stats, {
    dev: 0,
    ino: 0,
    mode: data.mode,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: data.size,
    blksize: 4096,
    blocks: Math.ceil(data.size / 512),
    atimeMs: data.mtimeMs,
    mtimeMs: data.mtimeMs,
    ctimeMs: data.mtimeMs,
    birthtimeMs: data.mtimeMs,
    atime: new Date(data.mtimeMs),
    mtime: new Date(data.mtimeMs),
    ctime: new Date(data.mtimeMs),
    birthtime: new Date(data.mtimeMs),
  });

  stats.isFile = () => data.isFile;
  stats.isDirectory = () => data.isDirectory;
  stats.isSymbolicLink = () => data.isSymbolicLink;
  stats.isBlockDevice = () => false;
  stats.isCharacterDevice = () => false;
  stats.isFIFO = () => false;
  stats.isSocket = () => false;

  return stats;
}

/**
 * Creates a Dirent-like object from cached child entry.
 */
function createDirentFromCache(
  name: string,
  type: FsChildEntry['type'],
  parentPath: string,
): Dirent {
  const dirent = Object.create(fs.Dirent.prototype) as Dirent;

  Object.assign(dirent, {
    name,
    parentPath,
    path: parentPath,
  });

  dirent.isFile = () => type === 'file';
  dirent.isDirectory = () => type === 'directory';
  dirent.isSymbolicLink = () => type === 'symlink';
  dirent.isBlockDevice = () => false;
  dirent.isCharacterDevice = () => false;
  dirent.isFIFO = () => false;
  dirent.isSocket = () => false;

  return dirent;
}

/**
 * Converts Dirent to FsChildEntry for caching.
 */
function direntToChildEntry(dirent: Dirent): FsChildEntry {
  let type: FsChildEntry['type'];
  if (dirent.isFile()) {
    type = 'file';
  } else if (dirent.isDirectory()) {
    type = 'directory';
  } else if (dirent.isSymbolicLink()) {
    type = 'symlink';
  }
  return { name: dirent.name, type };
}

/**
 * Cached Dir implementation for opendir.
 */
class CachedDir implements Dir {
  private index = 0;

  constructor(
    readonly path: string,
    private entries: FsChildEntry[],
  ) {}

  close(): Promise<void> {
    return Promise.resolve();
  }

  closeSync(): void {
    // No-op for cached dir
  }

  read(): Promise<Dirent | null>;
  read(cb: (err: NodeJS.ErrnoException | null, dirEnt: Dirent | null) => void): void;
  read(
    cb?: (err: NodeJS.ErrnoException | null, dirEnt: Dirent | null) => void,
  ): Promise<Dirent | null> | void {
    if (cb) {
      const result = this.readSync();
      setImmediate(() => cb(null, result));
      return;
    }
    return Promise.resolve(this.readSync());
  }

  readSync(): Dirent | null {
    if (this.index >= this.entries.length) {
      return null;
    }
    const entry = this.entries[this.index++];
    return createDirentFromCache(entry.name, entry.type, this.path);
  }

  *[Symbol.iterator](): IterableIterator<Dirent> {
    for (const entry of this.entries) {
      yield createDirentFromCache(entry.name, entry.type, this.path);
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<Dirent> {
    for (const entry of this.entries) {
      yield createDirentFromCache(entry.name, entry.type, this.path);
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }

  [Symbol.dispose](): void {
    this.closeSync();
  }
}

// ============================================================================
// Sync implementations
// ============================================================================

function cachedReadFileSync(
  path: fs.PathOrFileDescriptor,
  options?: { encoding?: BufferEncoding | null; flag?: string } | BufferEncoding | null,
): string | Buffer {
  if (typeof path !== 'string') {
    return originalFs.readFileSync(path, options as BufferEncoding);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.readFileSync(path, options as BufferEncoding);
  }

  const encoding = typeof options === 'string' ? options : options?.encoding;
  const cached = cache.getFileContent(path);

  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('open', path);
    }
    if (cached.value) {
      if (encoding) {
        if (typeof cached.value.content === 'string') {
          return cached.value.content;
        }
        return cached.value.content.toString(encoding);
      }
      if (Buffer.isBuffer(cached.value.content)) {
        return cached.value.content;
      }
      return Buffer.from(cached.value.content, cached.value.encoding || 'utf8');
    }
  }

  // Cache miss - read from disk
  cache.recordMiss('readFile');
  try {
    const content = originalFs.readFileSync(path, options as BufferEncoding);
    cache.setFileContent(path, content, encoding || undefined);
    return content;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setFileNotExists(path);
    }
    throw err;
  }
}

function cachedReaddirSync(
  path: fs.PathLike,
  options?:
    | { encoding?: BufferEncoding | null; withFileTypes?: boolean; recursive?: boolean }
    | BufferEncoding
    | null,
): string[] | Buffer[] | Dirent[] {
  if (typeof path !== 'string') {
    return originalFs.readdirSync(path, options as BufferEncoding) as string[];
  }

  const opts = typeof options === 'string' ? { encoding: options } : options;

  // Don't cache recursive reads
  if (opts?.recursive) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalFs.readdirSync(path, options as any);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.readdirSync(path, options as BufferEncoding) as string[];
  }

  const withFileTypes = opts?.withFileTypes ?? false;
  const cached = cache.getDirEntries(path, withFileTypes);

  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('scandir', path);
    }
    if (cached.value) {
      if (withFileTypes) {
        return cached.value.map(e => createDirentFromCache(e.name, e.type, path));
      }
      return cached.value.map(e => e.name);
    }
  }

  // Cache miss - read from disk
  cache.recordMiss('readdir');
  try {
    if (withFileTypes) {
      const entries = originalFs.readdirSync(path, { ...opts, withFileTypes: true }) as Dirent[];
      cache.setDirEntries(path, entries.map(direntToChildEntry));
      return entries;
    } else {
      const entries = originalFs.readdirSync(path, options as BufferEncoding) as string[];
      cache.setDirEntries(
        path,
        entries.map(name => ({ name })),
      );
      return entries;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

function cachedStatSync(path: fs.PathLike, options?: StatSyncOptions): Stats | undefined {
  if (typeof path !== 'string' || options?.bigint) {
    return originalFs.statSync(path, options);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.statSync(path, options);
  }

  const cached = cache.getStatEntry(path);
  if (cached) {
    if (!cached.exists) {
      if (options?.throwIfNoEntry === false) {
        return undefined;
      }
      throw createEnoentError('stat', path);
    }
    if (cached.value) {
      return createStatsFromCache(cached.value);
    }
  }

  // Cache miss
  cache.recordMiss('stat');
  try {
    const stats = originalFs.statSync(path, options) as Stats | undefined;
    if (stats) {
      cache.setStatEntry(path, extractStatsData(stats));
    }
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

function cachedLstatSync(path: fs.PathLike, options?: StatSyncOptions): Stats | undefined {
  if (typeof path !== 'string' || options?.bigint) {
    return originalFs.lstatSync(path, options);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.lstatSync(path, options);
  }

  // Use lstat: prefix to distinguish from stat
  const cacheKey = `lstat:${path}`;
  const cached = cache.getStatEntry(cacheKey);
  if (cached) {
    if (!cached.exists) {
      if (options?.throwIfNoEntry === false) {
        return undefined;
      }
      throw createEnoentError('lstat', path);
    }
    if (cached.value) {
      return createStatsFromCache(cached.value);
    }
  }

  // Cache miss
  cache.recordMiss('stat');
  try {
    const stats = originalFs.lstatSync(path, options) as Stats | undefined;
    if (stats) {
      cache.setStatEntry(cacheKey, extractStatsData(stats));
    }
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

function cachedExistsSync(path: fs.PathLike): boolean {
  if (typeof path !== 'string') {
    return originalFs.existsSync(path);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.existsSync(path);
  }

  const cached = cache.getExists(path);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss
  cache.recordMiss('exists');
  const exists = originalFs.existsSync(path);
  cache.setExists(path, exists);
  return exists;
}

function cachedRealpathSync(
  path: fs.PathLike,
  options?: { encoding?: BufferEncoding | null } | BufferEncoding | null,
): string | Buffer {
  if (typeof path !== 'string') {
    return originalFs.realpathSync(path, options as BufferEncoding);
  }

  const encoding = typeof options === 'string' ? options : options?.encoding;
  if ((encoding as string) === 'buffer') {
    return originalFs.realpathSync(path, options as BufferEncoding);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.realpathSync(path, options as BufferEncoding);
  }

  const cached = cache.getRealpath(path, false);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('realpath', path);
    }
    if (cached.value) {
      return cached.value;
    }
  }

  // Cache miss
  cache.recordMiss('realpath');
  try {
    const resolvedPath = originalFs.realpathSync(path, options as BufferEncoding) as string;
    cache.setRealpath(path, resolvedPath, false);
    return resolvedPath;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

function cachedRealpathSyncNative(
  path: fs.PathLike,
  options?: { encoding?: BufferEncoding | null } | BufferEncoding | null,
): string | Buffer {
  if (typeof path !== 'string') {
    return originalFs.realpathSyncNative(path, options as BufferEncoding);
  }

  const encoding = typeof options === 'string' ? options : options?.encoding;
  if ((encoding as string) === 'buffer') {
    return originalFs.realpathSyncNative(path, options as BufferEncoding);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.realpathSyncNative(path, options as BufferEncoding);
  }

  const cached = cache.getRealpath(path, true);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('realpath', path);
    }
    if (cached.value) {
      return cached.value;
    }
  }

  // Cache miss
  cache.recordMiss('realpath');
  try {
    const resolvedPath = originalFs.realpathSyncNative(path, options as BufferEncoding) as string;
    cache.setRealpath(path, resolvedPath, true);
    return resolvedPath;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

function cachedAccessSync(path: fs.PathLike, mode?: number): void {
  if (typeof path !== 'string') {
    return originalFs.accessSync(path, mode);
  }

  const accessMode = mode ?? fs.constants.F_OK;

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.accessSync(path, accessMode);
  }

  const cached = cache.getAccess(path, accessMode);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('access', path);
    }
    if (cached.value !== undefined) {
      if (!cached.value) {
        const err = new Error(
          `EACCES: permission denied, access '${path}'`,
        ) as NodeJS.ErrnoException;
        err.code = 'EACCES';
        err.errno = -13;
        err.syscall = 'access';
        err.path = path;
        throw err;
      }
      return;
    }
  }

  // Cache miss
  cache.recordMiss('access');
  try {
    originalFs.accessSync(path, accessMode);
    cache.setAccess(path, accessMode, true);
  } catch (err) {
    const errCode = (err as NodeJS.ErrnoException).code;
    if (errCode === 'ENOENT') {
      cache.setExists(path, false);
    } else if (errCode === 'EACCES') {
      cache.setAccess(path, accessMode, false);
    }
    throw err;
  }
}

function cachedOpendirSync(path: fs.PathLike, options?: fs.OpenDirOptions): Dir {
  if (typeof path !== 'string') {
    return originalFs.opendirSync(path, options);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.opendirSync(path, options);
  }

  // Check if we have cached children with type info
  const cached = cache.getDirEntries(path, true);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('opendir', path);
    }
    if (cached.value) {
      return new CachedDir(path, cached.value);
    }
  }

  // Cache miss - read from disk and cache
  cache.recordMiss('opendir');
  try {
    const dir = originalFs.opendirSync(path, options);
    const entries: FsChildEntry[] = [];

    // Read all entries and cache them
    let dirent: Dirent | null;
    while ((dirent = dir.readSync()) !== null) {
      entries.push(direntToChildEntry(dirent));
    }
    dir.closeSync();

    cache.setDirEntries(path, entries);
    return new CachedDir(path, entries);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

// ============================================================================
// Async implementations
// ============================================================================

async function cachedReadFile(
  path: fs.PathLike | fs.promises.FileHandle,
  options?: { encoding?: BufferEncoding | null; flag?: string } | BufferEncoding | null,
): Promise<string | Buffer> {
  if (typeof path !== 'string') {
    return originalFsPromises.readFile(path, options as BufferEncoding);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFsPromises.readFile(path, options as BufferEncoding);
  }

  const encoding = typeof options === 'string' ? options : options?.encoding;
  const cached = cache.getFileContent(path);

  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('open', path);
    }
    if (cached.value) {
      if (encoding) {
        if (typeof cached.value.content === 'string') {
          return cached.value.content;
        }
        return cached.value.content.toString(encoding);
      }
      if (Buffer.isBuffer(cached.value.content)) {
        return cached.value.content;
      }
      return Buffer.from(cached.value.content, cached.value.encoding || 'utf8');
    }
  }

  // Cache miss
  cache.recordMiss('readFile');
  try {
    const content = await originalFsPromises.readFile(path, options as BufferEncoding);
    cache.setFileContent(path, content, encoding || undefined);
    return content;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setFileNotExists(path);
    }
    throw err;
  }
}

async function cachedReaddir(
  path: fs.PathLike,
  options?:
    | { encoding?: BufferEncoding | null; withFileTypes?: boolean; recursive?: boolean }
    | BufferEncoding
    | null,
): Promise<string[] | Buffer[] | Dirent[]> {
  if (typeof path !== 'string') {
    return originalFsPromises.readdir(path, options as BufferEncoding) as Promise<string[]>;
  }

  const opts = typeof options === 'string' ? { encoding: options } : options;

  if (opts?.recursive) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalFsPromises.readdir(path, options as any);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFsPromises.readdir(path, options as BufferEncoding) as Promise<string[]>;
  }

  const withFileTypes = opts?.withFileTypes ?? false;
  const cached = cache.getDirEntries(path, withFileTypes);

  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('scandir', path);
    }
    if (cached.value) {
      if (withFileTypes) {
        return cached.value.map(e => createDirentFromCache(e.name, e.type, path));
      }
      return cached.value.map(e => e.name);
    }
  }

  // Cache miss
  cache.recordMiss('readdir');
  try {
    if (withFileTypes) {
      const entries = (await originalFsPromises.readdir(path, {
        ...opts,
        withFileTypes: true,
      })) as Dirent[];
      cache.setDirEntries(path, entries.map(direntToChildEntry));
      return entries;
    } else {
      const entries = (await originalFsPromises.readdir(
        path,
        options as BufferEncoding,
      )) as string[];
      cache.setDirEntries(
        path,
        entries.map(name => ({ name })),
      );
      return entries;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

async function cachedStat(path: fs.PathLike, options?: StatOptions): Promise<Stats> {
  if (typeof path !== 'string' || options?.bigint) {
    return originalFsPromises.stat(path, options) as Promise<Stats>;
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFsPromises.stat(path, options) as Promise<Stats>;
  }

  const cached = cache.getStatEntry(path);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('stat', path);
    }
    if (cached.value) {
      return createStatsFromCache(cached.value);
    }
  }

  // Cache miss
  cache.recordMiss('stat');
  try {
    const stats = (await originalFsPromises.stat(path, options)) as Stats;
    cache.setStatEntry(path, extractStatsData(stats));
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

async function cachedLstat(path: fs.PathLike, options?: StatOptions): Promise<Stats> {
  if (typeof path !== 'string' || options?.bigint) {
    return originalFsPromises.lstat(path, options) as Promise<Stats>;
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFsPromises.lstat(path, options) as Promise<Stats>;
  }

  const cacheKey = `lstat:${path}`;
  const cached = cache.getStatEntry(cacheKey);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('lstat', path);
    }
    if (cached.value) {
      return createStatsFromCache(cached.value);
    }
  }

  // Cache miss
  cache.recordMiss('stat');
  try {
    const stats = (await originalFsPromises.lstat(path, options)) as Stats;
    cache.setStatEntry(cacheKey, extractStatsData(stats));
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

async function cachedRealpathPromise(
  path: fs.PathLike,
  options?: { encoding?: BufferEncoding | null } | BufferEncoding | null,
): Promise<string | Buffer> {
  if (typeof path !== 'string') {
    return originalFsPromises.realpath(path, options as BufferEncoding);
  }

  const encoding = typeof options === 'string' ? options : options?.encoding;
  if ((encoding as string) === 'buffer') {
    return originalFsPromises.realpath(path, options as BufferEncoding);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFsPromises.realpath(path, options as BufferEncoding);
  }

  const cached = cache.getRealpath(path, false);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('realpath', path);
    }
    if (cached.value) {
      return cached.value;
    }
  }

  // Cache miss
  cache.recordMiss('realpath');
  try {
    const resolvedPath = (await originalFsPromises.realpath(
      path,
      options as BufferEncoding,
    )) as string;
    cache.setRealpath(path, resolvedPath, false);
    return resolvedPath;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

async function cachedAccessPromise(path: fs.PathLike, mode?: number): Promise<void> {
  if (typeof path !== 'string') {
    return originalFsPromises.access(path, mode);
  }

  const accessMode = mode ?? fs.constants.F_OK;

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFsPromises.access(path, accessMode);
  }

  const cached = cache.getAccess(path, accessMode);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('access', path);
    }
    if (cached.value !== undefined) {
      if (!cached.value) {
        const err = new Error(
          `EACCES: permission denied, access '${path}'`,
        ) as NodeJS.ErrnoException;
        err.code = 'EACCES';
        err.errno = -13;
        err.syscall = 'access';
        err.path = path;
        throw err;
      }
      return;
    }
  }

  // Cache miss
  cache.recordMiss('access');
  try {
    await originalFsPromises.access(path, accessMode);
    cache.setAccess(path, accessMode, true);
  } catch (err) {
    const errCode = (err as NodeJS.ErrnoException).code;
    if (errCode === 'ENOENT') {
      cache.setExists(path, false);
    } else if (errCode === 'EACCES') {
      cache.setAccess(path, accessMode, false);
    }
    throw err;
  }
}

async function cachedOpendirPromise(path: fs.PathLike, options?: fs.OpenDirOptions): Promise<Dir> {
  if (typeof path !== 'string') {
    return originalFsPromises.opendir(path, options);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFsPromises.opendir(path, options);
  }

  // Check if we have cached children with type info
  const cached = cache.getDirEntries(path, true);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('opendir', path);
    }
    if (cached.value) {
      return new CachedDir(path, cached.value);
    }
  }

  // Cache miss - read from disk and cache
  cache.recordMiss('opendir');
  try {
    const dir = await originalFsPromises.opendir(path, options);
    const entries: FsChildEntry[] = [];

    // Read all entries and cache them
    for await (const dirent of dir) {
      entries.push(direntToChildEntry(dirent));
    }

    cache.setDirEntries(path, entries);
    return new CachedDir(path, entries);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(path, false);
    }
    throw err;
  }
}

// ============================================================================
// Patching functions
// ============================================================================

/**
 * Applies monkey patches to the fs module.
 */
export function patchFs(): void {
  if (isPatched) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fsAny = fs as any;

  fsAny.readFileSync = cachedReadFileSync;
  fsAny.readdirSync = cachedReaddirSync;
  fsAny.existsSync = cachedExistsSync;
  fsAny.accessSync = cachedAccessSync;
  fsAny.opendirSync = cachedOpendirSync;

  Object.defineProperty(fs, 'statSync', {
    value: cachedStatSync,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(fs, 'lstatSync', {
    value: cachedLstatSync,
    writable: true,
    configurable: true,
  });

  const patchedRealpathSync = cachedRealpathSync as typeof fs.realpathSync;
  (patchedRealpathSync as typeof fs.realpathSync).native =
    cachedRealpathSyncNative as typeof fs.realpathSync.native;
  Object.defineProperty(fs, 'realpathSync', {
    value: patchedRealpathSync,
    writable: true,
    configurable: true,
  });

  // Patch fs.promises
  fsAny.promises.readFile = cachedReadFile;
  fsAny.promises.readdir = cachedReaddir;
  fsAny.promises.stat = cachedStat;
  fsAny.promises.lstat = cachedLstat;
  fsAny.promises.realpath = cachedRealpathPromise;
  fsAny.promises.access = cachedAccessPromise;
  fsAny.promises.opendir = cachedOpendirPromise;

  isPatched = true;
}

/**
 * Removes monkey patches from the fs module.
 */
export function unpatchFs(): void {
  if (!isPatched) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fsAny = fs as any;

  fsAny.readFileSync = originalFs.readFileSync;
  fsAny.readdirSync = originalFs.readdirSync;
  fsAny.existsSync = originalFs.existsSync;
  fsAny.accessSync = originalFs.accessSync;
  fsAny.opendirSync = originalFs.opendirSync;

  Object.defineProperty(fs, 'statSync', {
    value: originalFs.statSync,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(fs, 'lstatSync', {
    value: originalFs.lstatSync,
    writable: true,
    configurable: true,
  });

  const originalRealpathSync = originalFs.realpathSync as typeof fs.realpathSync;
  (originalRealpathSync as typeof fs.realpathSync).native =
    originalFs.realpathSyncNative as typeof fs.realpathSync.native;
  Object.defineProperty(fs, 'realpathSync', {
    value: originalRealpathSync,
    writable: true,
    configurable: true,
  });

  fsAny.promises.readFile = originalFsPromises.readFile;
  fsAny.promises.readdir = originalFsPromises.readdir;
  fsAny.promises.stat = originalFsPromises.stat;
  fsAny.promises.lstat = originalFsPromises.lstat;
  fsAny.promises.realpath = originalFsPromises.realpath;
  fsAny.promises.access = originalFsPromises.access;
  fsAny.promises.opendir = originalFsPromises.opendir;

  isPatched = false;
}

/**
 * Gets the original (unpatched) fs functions.
 */
export function getOriginalFs() {
  return {
    ...originalFs,
    promises: { ...originalFsPromises },
  };
}

/**
 * Returns whether fs is currently patched.
 */
export function isFsPatched(): boolean {
  return isPatched;
}
