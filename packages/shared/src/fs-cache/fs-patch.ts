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
import path from 'node:path';
import type { Stats, StatOptions, StatSyncOptions, Dirent, Dir } from 'node:fs';
import { getFsCacheManager } from './cache-manager.js';
import type { FsChildEntry, FsNodeStat } from './cache-types.js';
import { isUnderBaseDir, toRelativeCachePath } from './cache-utils.js';

// Enable detailed stats tracking (caller tracking, hit/miss per operation)
// This has performance overhead due to stack trace analysis on every fs call
const STATS_ENABLED = process.env.FS_CACHE_STATS === '1';

// Methods that we cache (these have custom implementations)
const CACHED_SYNC_METHODS = new Set([
  'readFileSync',
  'readdirSync',
  'statSync',
  'lstatSync',
  'existsSync',
  'realpathSync',
  'accessSync',
  'opendirSync',
  // Note: fd operations (openSync, readSync, closeSync, fstatSync) are NOT cached
  // because they cause TypeScript to behave differently (better type info).
  // See comment in patchFs() for details.
]);

const CACHED_PROMISE_METHODS = new Set([
  'readFile',
  'readdir',
  'stat',
  'lstat',
  'realpath',
  'access',
  'opendir',
]);

// Methods to skip (not real fs operations or shouldn't be wrapped)
const SKIP_METHODS = new Set([
  // Constants and properties
  'constants',
  'promises',
  'F_OK',
  'R_OK',
  'W_OK',
  'X_OK',
  // Classes (wrapping these would break instanceof)
  'Stats',
  'Dirent',
  'Dir',
  'ReadStream',
  'WriteStream',
  'FileHandle',
  // Deprecated
  'exists', // deprecated async version
]);

/**
 * Extracts the caller module/package from a stack trace.
 * Looks for the first frame that's not in fs-cache or node internals.
 */
function getCallerFromStack(): string {
  const err = new Error();
  const stack = err.stack;
  if (!stack) return 'unknown';

  const lines = stack.split('\n');
  // Skip first line (Error message) and frames from fs-cache
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    // Skip our own modules
    if (line.includes('fs-cache') || line.includes('fs-patch')) continue;

    // Skip node internals
    if (line.includes('node:') || line.includes('(node:')) continue;

    // Extract module path
    // Format: "    at functionName (path:line:col)" or "    at path:line:col"
    const match = line.match(/at\s+(?:.*?\s+\()?(.+?)(?::\d+:\d+)?\)?$/);
    if (match) {
      const fullPath = match[1];

      // Try to extract package name from path
      // Look for node_modules/package-name or just the filename
      const nodeModulesMatch = fullPath.match(/node_modules[/\\](@[^/\\]+[/\\][^/\\]+|[^/\\]+)/);
      if (nodeModulesMatch) {
        return nodeModulesMatch[1].replace(/\\/g, '/');
      }

      // For non-node_modules paths, extract just filename or relative path
      const pathMatch = fullPath.match(/([^/\\]+[/\\][^/\\]+[/\\][^/\\]+)$/);
      if (pathMatch) {
        return pathMatch[1].replace(/\\/g, '/');
      }

      // Fallback: just return the last part of the path
      const lastPart = fullPath.split(/[/\\]/).slice(-2).join('/');
      return lastPart || fullPath;
    }
  }

  return 'unknown';
}

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
  // File descriptor operations
  openSync: fs.openSync.bind(fs),
  readSync: fs.readSync.bind(fs),
  closeSync: fs.closeSync.bind(fs),
  fstatSync: fs.fstatSync.bind(fs),
};

// ============================================================================
// Virtual File Descriptor System
// ============================================================================

// Track file descriptors: fd -> { path, position, isReal }
interface FdEntry {
  path: string;
  position: number;
  isReal: boolean; // true = real kernel fd, false = fake fd for offline mode
}
const fdMap = new Map<number, FdEntry>();

// Counter for generating fake fd numbers for offline mode
let nextFakeFd = 10000; // High enough to not conflict with real fds

/**
 * Checks if a file descriptor is tracked by us.
 */
function isTrackedFd(fd: number): boolean {
  return fdMap.has(fd);
}

/**
 * Tracks a real fd for a path.
 */
function trackFd(fd: number, path: string, isReal: boolean = true): void {
  fdMap.set(fd, { path, position: 0, isReal });
}

/**
 * Gets a new fake fd number for offline mode.
 */
function getNextCachedFd(): number {
  return nextFakeFd++;
}

/**
 * Gets fd entry.
 */
function getFdEntry(fd: number): FdEntry | undefined {
  return fdMap.get(fd);
}

/**
 * Removes fd tracking and returns the entry (to check if it was real).
 */
function untrackFd(fd: number): FdEntry | undefined {
  const entry = fdMap.get(fd);
  fdMap.delete(fd);
  return entry;
}

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

  // Only cache files under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('readFile', getCallerFromStack());
    return originalFs.readFileSync(path, options as BufferEncoding);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const encoding = typeof options === 'string' ? options : options?.encoding;
  const cached = cache.getFileContent(relativePath);

  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('open', path);
    }
    if (cached.value) {
      // Content is always stored as Buffer - convert to string if encoding requested
      const buffer = cached.value.content;
      if (encoding) {
        return buffer.toString(encoding);
      }
      return buffer;
    }
  }

  // Cache miss - read from disk as Buffer (always cache raw bytes)
  STATS_ENABLED && cache.recordMiss('readFile', getCallerFromStack());
  try {
    const buffer = originalFs.readFileSync(path);
    if (
      DEBUG_FD &&
      (path.endsWith('.d.ts') || path.endsWith('tsconfig.json') || path.endsWith('package.json'))
    ) {
      console.log(`[readFileSync] ${path}`);
    }
    cache.setFileContent(relativePath, buffer);
    // Return with encoding if requested
    if (encoding) {
      return buffer.toString(encoding);
    }
    return buffer;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setFileNotExists(relativePath);
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

  // Only cache directories under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('readdir', getCallerFromStack());
    return originalFs.readdirSync(path, options as BufferEncoding) as string[];
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const withFileTypes = opts?.withFileTypes ?? false;
  const cached = cache.getDirEntries(relativePath, withFileTypes);

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
  STATS_ENABLED && cache.recordMiss('readdir', getCallerFromStack());
  try {
    if (withFileTypes) {
      const entries = originalFs.readdirSync(path, { ...opts, withFileTypes: true }) as Dirent[];
      cache.setDirEntries(relativePath, entries.map(direntToChildEntry));
      return entries;
    } else {
      const entries = originalFs.readdirSync(path, options as BufferEncoding) as string[];
      cache.setDirEntries(
        relativePath,
        entries.map(name => ({ name })),
      );
      return entries;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('stat', getCallerFromStack());
    return originalFs.statSync(path, options);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getStatEntry(relativePath);
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
  STATS_ENABLED && cache.recordMiss('stat', getCallerFromStack());
  try {
    const stats = originalFs.statSync(path, options) as Stats | undefined;
    if (stats) {
      cache.setStatEntry(relativePath, extractStatsData(stats));
    } else if (options?.throwIfNoEntry === false) {
      // statSync returned undefined = file doesn't exist
      cache.setExists(relativePath, false);
    }
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('lstat', getCallerFromStack());
    return originalFs.lstatSync(path, options);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  // Use lstat: prefix to distinguish from stat
  const cacheKey = `lstat:${relativePath}`;
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
  STATS_ENABLED && cache.recordMiss('stat', getCallerFromStack());
  try {
    const stats = originalFs.lstatSync(path, options) as Stats | undefined;
    if (stats) {
      cache.setStatEntry(cacheKey, extractStatsData(stats));
    } else if (options?.throwIfNoEntry === false) {
      // lstatSync returned undefined = file doesn't exist
      cache.setExists(relativePath, false);
    }
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('exists', getCallerFromStack());
    return originalFs.existsSync(path);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getExists(relativePath);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss
  STATS_ENABLED && cache.recordMiss('exists', getCallerFromStack());
  const exists = originalFs.existsSync(path);
  cache.setExists(relativePath, exists);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('realpath', getCallerFromStack());
    return originalFs.realpathSync(path, options as BufferEncoding);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getRealpath(relativePath, false);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('realpath', path);
    }
    if (cached.value) {
      // Cached value is relative, convert back to absolute.
      // Note: Returns Unix-style path (forward slashes) for consistency with baseDir.
      return cache.baseDir + '/' + cached.value;
    }
  }

  // Cache miss
  STATS_ENABLED && cache.recordMiss('realpath', getCallerFromStack());
  try {
    const resolvedPath = originalFs.realpathSync(path, options as BufferEncoding) as string;
    // Store relative path if result is under baseDir
    if (isUnderBaseDir(resolvedPath, cache.baseDir)) {
      const relativeResolved = toRelativeCachePath(resolvedPath, cache.baseDir);
      cache.setRealpath(relativePath, relativeResolved, false);
    }
    return resolvedPath;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('realpath', getCallerFromStack());
    return originalFs.realpathSyncNative(path, options as BufferEncoding);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getRealpath(relativePath, true);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('realpath', path);
    }
    if (cached.value) {
      // Cached value is relative, convert back to absolute.
      // Note: Returns Unix-style path (forward slashes) for consistency with baseDir.
      return cache.baseDir + '/' + cached.value;
    }
  }

  // Cache miss
  STATS_ENABLED && cache.recordMiss('realpath', getCallerFromStack());
  try {
    const resolvedPath = originalFs.realpathSyncNative(path, options as BufferEncoding) as string;
    // Store relative path if result is under baseDir
    if (isUnderBaseDir(resolvedPath, cache.baseDir)) {
      const relativeResolved = toRelativeCachePath(resolvedPath, cache.baseDir);
      cache.setRealpath(relativePath, relativeResolved, true);
    }
    return resolvedPath;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('access', getCallerFromStack());
    return originalFs.accessSync(path, accessMode);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getAccess(relativePath, accessMode);
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
  STATS_ENABLED && cache.recordMiss('access', getCallerFromStack());
  try {
    originalFs.accessSync(path, accessMode);
    cache.setAccess(relativePath, accessMode, true);
  } catch (err) {
    const errCode = (err as NodeJS.ErrnoException).code;
    if (errCode === 'ENOENT') {
      cache.setExists(relativePath, false);
    } else if (errCode === 'EACCES') {
      cache.setAccess(relativePath, accessMode, false);
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

  // Only cache directories under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('opendir', getCallerFromStack());
    return originalFs.opendirSync(path, options);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  // Check if we have cached children with type info
  const cached = cache.getDirEntries(relativePath, true);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('opendir', path);
    }
    if (cached.value) {
      return new CachedDir(path, cached.value);
    }
  }

  // Cache miss - read from disk and cache
  STATS_ENABLED && cache.recordMiss('opendir', getCallerFromStack());
  try {
    const dir = originalFs.opendirSync(path, options);
    const entries: FsChildEntry[] = [];

    // Read all entries and cache them
    let dirent: Dirent | null;
    while ((dirent = dir.readSync()) !== null) {
      entries.push(direntToChildEntry(dirent));
    }
    dir.closeSync();

    cache.setDirEntries(relativePath, entries);
    return new CachedDir(path, entries);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
    }
    throw err;
  }
}

// ============================================================================
// File descriptor operations (openSync, readSync, closeSync)
// ============================================================================

const DEBUG_FD = process.env.DEBUG_FD === '1';
const DEBUG_FD_COMPARE = process.env.DEBUG_FD_COMPARE === '1';

// For comparison mode: map real fd -> path for tracking
const realFdPaths = new Map<number, { path: string; position: number }>();

function cachedOpenSync(path: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode | null): number {
  // Only cache read operations (flags starting with 'r')
  const flagStr = typeof flags === 'string' ? flags : String(flags);
  const isReadOnly = flagStr === 'r' || (flagStr.startsWith('r') && !flagStr.includes('+'));

  if (typeof path !== 'string' || !isReadOnly) {
    return originalFs.openSync(path, flags, mode);
  }

  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.openSync(path, flags, mode);
  }

  // Only cache files under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    return originalFs.openSync(path, flags, mode);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  // Check if we have cached content FIRST (enables offline mode)
  const cached = cache.getFileContent(relativePath);

  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('open', path);
    }
    if (cached.value) {
      // Cache hit - try to open real fd, but fall back to fake fd for offline mode
      STATS_ENABLED && cache.recordHit('readFile', getCallerFromStack());
      try {
        const realFd = originalFs.openSync(path, flags, mode);
        if (DEBUG_FD) {
          console.log(`[FD] openSync: ${path} (cache: HIT, fd=${realFd})`);
        }
        trackFd(realFd, relativePath, true); // real fd, store relative path
        return realFd;
      } catch {
        // File doesn't exist on disk but we have cached content - use fake fd (offline mode)
        const fakeFd = getNextCachedFd();
        if (DEBUG_FD) {
          console.log(`[FD] openSync: ${path} (cache: HIT, offline fakeFd=${fakeFd})`);
        }
        trackFd(fakeFd, relativePath, false); // fake fd, store relative path
        return fakeFd;
      }
    }
  }

  // Cache miss - must read from real filesystem
  STATS_ENABLED && cache.recordMiss('readFile', getCallerFromStack());
  const realFd = originalFs.openSync(path, flags, mode);
  if (DEBUG_FD) {
    console.log(`[FD] openSync: ${path} (cache: MISS, fd=${realFd})`);
  }
  try {
    const stats = originalFs.fstatSync(realFd);
    const buffer = Buffer.allocUnsafe(stats.size);
    let bytesRead = 0;
    while (bytesRead < stats.size) {
      const result = originalFs.readSync(
        realFd,
        buffer,
        bytesRead,
        stats.size - bytesRead,
        bytesRead,
      );
      if (result === 0) break;
      bytesRead += result;
    }
    const content = bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead);
    cache.setFileContent(relativePath, content);
    trackFd(realFd, relativePath, true); // real fd, store relative path
    return realFd;
  } catch (err) {
    originalFs.closeSync(realFd);
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setFileNotExists(relativePath);
    }
    throw err;
  }
}

function cachedReadSync(
  fd: number,
  buffer: NodeJS.ArrayBufferView,
  offset?: number | null,
  length?: number | null,
  position?: number | null,
): number {
  const entry = getFdEntry(fd);

  // Not tracked - pass through to original
  if (!entry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalFs.readSync as any)(fd, buffer, offset, length, position);
  }

  // Get content from cache
  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalFs.readSync as any)(fd, buffer, offset, length, position);
  }

  const cached = cache.getFileContent(entry.path);
  if (!cached?.value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalFs.readSync as any)(fd, buffer, offset, length, position);
  }

  // Read from cached content
  const content = cached.value.content;
  const buf = buffer as Buffer;
  const readOffset = offset ?? 0;
  const readLength = length ?? buf.length - readOffset;
  const readPosition = position ?? entry.position;

  const bytesAvailable = content.length - readPosition;
  const bytesToRead = Math.min(readLength, bytesAvailable);

  if (bytesToRead <= 0) {
    return 0; // EOF
  }

  content.copy(buf, readOffset, readPosition, readPosition + bytesToRead);

  // Update position if not using explicit position
  if (position === null || position === undefined) {
    entry.position += bytesToRead;
  }

  return bytesToRead;
}

function cachedCloseSync(fd: number): void {
  const entry = untrackFd(fd);
  if (!entry || entry.isReal) {
    // Real fd or unknown - close it
    originalFs.closeSync(fd);
  }
  // Fake fds (offline mode) don't need closing
}

function cachedFstatSync(fd: number, options?: fs.StatSyncOptions): Stats | undefined {
  const entry = getFdEntry(fd);

  // Not tracked - pass through to original
  if (!entry) {
    return originalFs.fstatSync(fd, options);
  }

  // Get stat from cache via the path
  const cache = getFsCacheManager().getActiveCache();
  if (!cache) {
    return originalFs.fstatSync(fd, options);
  }

  // Check stat cache first
  const cached = cache.getStatEntry(entry.path);
  if (cached?.value) {
    return createStatsFromCache(cached.value);
  }

  // Derive stats from cached content
  const contentCached = cache.getFileContent(entry.path);
  if (contentCached?.value) {
    const content = contentCached.value.content;
    const stats = Object.create(fs.Stats.prototype) as Stats;
    Object.assign(stats, {
      dev: 0,
      ino: 0,
      mode: 0o100644, // Regular file
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      size: content.length,
      blksize: 4096,
      blocks: Math.ceil(content.length / 512),
      atimeMs: Date.now(),
      mtimeMs: Date.now(),
      ctimeMs: Date.now(),
      birthtimeMs: Date.now(),
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    });
    stats.isFile = () => true;
    stats.isDirectory = () => false;
    stats.isSymbolicLink = () => false;
    stats.isBlockDevice = () => false;
    stats.isCharacterDevice = () => false;
    stats.isFIFO = () => false;
    stats.isSocket = () => false;
    return stats;
  }

  // Fallback to real fstatSync (shouldn't happen if properly tracked)
  return originalFs.fstatSync(fd, options);
}

// ============================================================================
// Comparison mode wrappers - call real fs and compare with what cache would return
// ============================================================================

function compareOpenSync(path: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode | null): number {
  // Always use real fd
  const realFd = originalFs.openSync(path, flags, mode);

  // Track this fd for comparison in readSync
  if (typeof path === 'string') {
    const flagStr = typeof flags === 'string' ? flags : String(flags);
    const isReadOnly = flagStr === 'r' || (flagStr.startsWith('r') && !flagStr.includes('+'));
    if (isReadOnly) {
      realFdPaths.set(realFd, { path, position: 0 });

      // Check what cache would have done
      const cache = getFsCacheManager().getActiveCache();
      if (cache) {
        const cached = cache.getFileContent(path);
        if (cached?.value) {
          console.log(`[FD-CMP] openSync HIT: ${path} (real fd=${realFd})`);
        } else {
          // Cache miss - read and cache for future comparison
          try {
            const stats = originalFs.fstatSync(realFd);
            const buffer = Buffer.allocUnsafe(stats.size);
            let bytesRead = 0;
            // Read at position 0 without changing fd position
            while (bytesRead < stats.size) {
              const result = originalFs.readSync(
                realFd,
                buffer,
                bytesRead,
                stats.size - bytesRead,
                bytesRead,
              );
              if (result === 0) break;
              bytesRead += result;
            }
            const content = bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead);
            cache.setFileContent(path, content);
            STATS_ENABLED && cache.recordMiss('readFile', getCallerFromStack());
            console.log(`[FD-CMP] openSync MISS: ${path} (cached ${content.length} bytes)`);
          } catch (e) {
            console.log(`[FD-CMP] openSync ERROR caching: ${path}: ${e}`);
          }
        }
      }
    }
  }

  return realFd;
}

function compareReadSync(
  fd: number,
  buffer: NodeJS.ArrayBufferView,
  offset?: number | null,
  length?: number | null,
  position?: number | null,
): number {
  const tracking = realFdPaths.get(fd);

  // Call real readSync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realResult = (originalFs.readSync as any)(fd, buffer, offset, length, position);

  // Compare with what cache would return
  if (tracking) {
    const cache = getFsCacheManager().getActiveCache();
    if (cache) {
      const cached = cache.getFileContent(tracking.path);
      if (cached?.value) {
        const content = cached.value.content;
        const buf = buffer as Buffer;
        const readOffset = offset ?? 0;
        const readLength = length ?? buf.length - readOffset;
        const readPosition = position ?? tracking.position;

        // Calculate what cache would return
        const bytesAvailable = content.length - readPosition;
        const bytesToRead = Math.min(readLength, bytesAvailable);
        const cachedResult = bytesToRead <= 0 ? 0 : bytesToRead;

        // Compare bytes read count
        if (realResult !== cachedResult) {
          console.log(`[FD-CMP] readSync MISMATCH bytesRead: ${tracking.path}`);
          console.log(`  real=${realResult}, cached=${cachedResult}`);
          console.log(`  offset=${readOffset}, length=${readLength}, position=${readPosition}`);
          console.log(`  content.length=${content.length}, bytesAvailable=${bytesAvailable}`);
        }

        // Compare actual content
        if (realResult > 0 && cachedResult > 0) {
          const realData = buf.subarray(readOffset, readOffset + realResult);
          const cachedData = content.subarray(readPosition, readPosition + cachedResult);

          if (
            !realData.equals(cachedData.subarray(0, Math.min(realData.length, cachedData.length)))
          ) {
            console.log(`[FD-CMP] readSync MISMATCH content: ${tracking.path}`);
            console.log(`  position=${readPosition}`);
            // Show first difference
            for (let i = 0; i < Math.min(realData.length, cachedData.length); i++) {
              if (realData[i] !== cachedData[i]) {
                console.log(
                  `  first diff at byte ${i}: real=0x${realData[i].toString(16)}, cached=0x${cachedData[i].toString(16)}`,
                );
                break;
              }
            }
          }
        }

        // Update tracked position if not using explicit position
        if (position === null || position === undefined) {
          tracking.position += realResult;
        }
      }
    }
  }

  return realResult;
}

function compareCloseSync(fd: number): void {
  realFdPaths.delete(fd);
  return originalFs.closeSync(fd);
}

function compareFstatSync(fd: number, options?: fs.StatSyncOptions): Stats | undefined {
  // Call real fstatSync
  const realStats = originalFs.fstatSync(fd, options);

  // Compare with what cache would return
  const tracking = realFdPaths.get(fd);
  if (tracking && realStats) {
    const cache = getFsCacheManager().getActiveCache();
    if (cache) {
      // Check stat cache first
      const cachedStat = cache.getStatEntry(tracking.path);
      if (cachedStat?.value) {
        const cached = cachedStat.value;
        if (realStats.size !== cached.size) {
          console.log(`[FD-CMP] fstatSync MISMATCH size: ${tracking.path}`);
          console.log(`  real=${realStats.size}, cached=${cached.size}`);
        }
        if (realStats.isFile() !== cached.isFile) {
          console.log(`[FD-CMP] fstatSync MISMATCH isFile: ${tracking.path}`);
        }
        if (realStats.isDirectory() !== cached.isDirectory) {
          console.log(`[FD-CMP] fstatSync MISMATCH isDirectory: ${tracking.path}`);
        }
      } else {
        // Check if we'd derive stats from content cache
        const contentCached = cache.getFileContent(tracking.path);
        if (contentCached?.value) {
          const contentSize = contentCached.value.content.length;
          if (realStats.size !== contentSize) {
            console.log(`[FD-CMP] fstatSync MISMATCH size (from content): ${tracking.path}`);
            console.log(`  real=${realStats.size}, cached content.length=${contentSize}`);
          }
        }
      }
    }
  }

  return realStats;
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

  // Only cache files under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('readFile', getCallerFromStack());
    return originalFsPromises.readFile(path, options as BufferEncoding);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const encoding = typeof options === 'string' ? options : options?.encoding;
  const cached = cache.getFileContent(relativePath);

  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('open', path);
    }
    if (cached.value) {
      // Content is always stored as Buffer - convert to string if encoding requested
      const buffer = cached.value.content;
      if (encoding) {
        return buffer.toString(encoding);
      }
      return buffer;
    }
  }

  // Cache miss - read from disk as Buffer (always cache raw bytes)
  STATS_ENABLED && cache.recordMiss('readFile', getCallerFromStack());
  try {
    const buffer = await originalFsPromises.readFile(path);
    cache.setFileContent(relativePath, buffer);
    // Return with encoding if requested
    if (encoding) {
      return buffer.toString(encoding);
    }
    return buffer;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setFileNotExists(relativePath);
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

  // Only cache directories under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('readdir', getCallerFromStack());
    return originalFsPromises.readdir(path, options as BufferEncoding) as Promise<string[]>;
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const withFileTypes = opts?.withFileTypes ?? false;
  const cached = cache.getDirEntries(relativePath, withFileTypes);

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
  STATS_ENABLED && cache.recordMiss('readdir', getCallerFromStack());
  try {
    if (withFileTypes) {
      const entries = (await originalFsPromises.readdir(path, {
        ...opts,
        withFileTypes: true,
      })) as Dirent[];
      cache.setDirEntries(relativePath, entries.map(direntToChildEntry));
      return entries;
    } else {
      const entries = (await originalFsPromises.readdir(
        path,
        options as BufferEncoding,
      )) as string[];
      cache.setDirEntries(
        relativePath,
        entries.map(name => ({ name })),
      );
      return entries;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('stat', getCallerFromStack());
    return originalFsPromises.stat(path, options) as Promise<Stats>;
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getStatEntry(relativePath);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('stat', path);
    }
    if (cached.value) {
      return createStatsFromCache(cached.value);
    }
  }

  // Cache miss
  STATS_ENABLED && cache.recordMiss('stat', getCallerFromStack());
  try {
    const stats = (await originalFsPromises.stat(path, options)) as Stats;
    cache.setStatEntry(relativePath, extractStatsData(stats));
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('lstat', getCallerFromStack());
    return originalFsPromises.lstat(path, options) as Promise<Stats>;
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cacheKey = `lstat:${relativePath}`;
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
  STATS_ENABLED && cache.recordMiss('stat', getCallerFromStack());
  try {
    const stats = (await originalFsPromises.lstat(path, options)) as Stats;
    cache.setStatEntry(cacheKey, extractStatsData(stats));
    return stats;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('realpath', getCallerFromStack());
    return originalFsPromises.realpath(path, options as BufferEncoding);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getRealpath(relativePath, false);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('realpath', path);
    }
    if (cached.value) {
      // Cached value is relative, convert back to absolute.
      // Note: Returns Unix-style path (forward slashes) for consistency with baseDir.
      return cache.baseDir + '/' + cached.value;
    }
  }

  // Cache miss
  STATS_ENABLED && cache.recordMiss('realpath', getCallerFromStack());
  try {
    const resolvedPath = (await originalFsPromises.realpath(
      path,
      options as BufferEncoding,
    )) as string;
    // Store relative path if result is under baseDir
    if (isUnderBaseDir(resolvedPath, cache.baseDir)) {
      const relativeResolved = toRelativeCachePath(resolvedPath, cache.baseDir);
      cache.setRealpath(relativePath, relativeResolved, false);
    }
    return resolvedPath;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
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

  // Only cache paths under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('access', getCallerFromStack());
    return originalFsPromises.access(path, accessMode);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  const cached = cache.getAccess(relativePath, accessMode);
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
  STATS_ENABLED && cache.recordMiss('access', getCallerFromStack());
  try {
    await originalFsPromises.access(path, accessMode);
    cache.setAccess(relativePath, accessMode, true);
  } catch (err) {
    const errCode = (err as NodeJS.ErrnoException).code;
    if (errCode === 'ENOENT') {
      cache.setExists(relativePath, false);
    } else if (errCode === 'EACCES') {
      cache.setAccess(relativePath, accessMode, false);
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

  // Only cache directories under baseDir
  if (!isUnderBaseDir(path, cache.baseDir)) {
    STATS_ENABLED && cache.recordExternal('opendir', getCallerFromStack());
    return originalFsPromises.opendir(path, options);
  }

  const relativePath = toRelativeCachePath(path, cache.baseDir);
  // Check if we have cached children with type info
  const cached = cache.getDirEntries(relativePath, true);
  if (cached) {
    if (!cached.exists) {
      throw createEnoentError('opendir', path);
    }
    if (cached.value) {
      return new CachedDir(path, cached.value);
    }
  }

  // Cache miss - read from disk and cache
  STATS_ENABLED && cache.recordMiss('opendir', getCallerFromStack());
  try {
    const dir = await originalFsPromises.opendir(path, options);
    const entries: FsChildEntry[] = [];

    // Read all entries and cache them
    for await (const dirent of dir) {
      entries.push(direntToChildEntry(dirent));
    }

    cache.setDirEntries(relativePath, entries);
    return new CachedDir(path, entries);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.setExists(relativePath, false);
    }
    throw err;
  }
}

// ============================================================================
// Dynamic uncached method tracking
// ============================================================================

// Store original uncached sync methods
const originalUncachedSync = new Map<string, Function>();

// Store original uncached promise methods
const originalUncachedPromises = new Map<string, Function>();

/**
 * Creates a wrapper function that tracks stats but forwards to the original.
 */
function createTrackingWrapper(
  methodName: string,
  originalFn: Function,
  isPromise: boolean,
): Function {
  if (isPromise) {
    return async function (...args: unknown[]) {
      const cache = getFsCacheManager().getActiveCache();
      if (cache) {
        STATS_ENABLED && cache.recordUncached(methodName, getCallerFromStack());
      }
      return originalFn.apply(this, args);
    };
  } else {
    return function (...args: unknown[]) {
      const cache = getFsCacheManager().getActiveCache();
      if (cache) {
        STATS_ENABLED && cache.recordUncached(methodName, getCallerFromStack());
      }
      // Debug: log openSync calls
      if (DEBUG_FD && methodName === 'openSync' && typeof args[0] === 'string') {
        const path = args[0] as string;
        if (path.includes('lib.') && path.endsWith('.d.ts')) {
          console.log(`[FD-UNCACHED] openSync: ${path}`);
        }
        // Also log tsconfig and package.json
        if (path.endsWith('tsconfig.json') || path.endsWith('package.json')) {
          console.log(`[FD-UNCACHED] openSync: ${path}`);
        }
      }
      return originalFn.apply(this, args);
    };
  }
}

/**
 * Safely patches a method on an object, handling getter-only properties.
 */
function safePatchMethod(
  obj: object,
  key: string,
  wrapper: Function,
  original: Function,
  store: Map<string, Function>,
): boolean {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (descriptor && !descriptor.configurable) {
      // Can't patch non-configurable properties
      return false;
    }
    if (descriptor && descriptor.get && !descriptor.set) {
      // Getter-only property - try to redefine
      try {
        Object.defineProperty(obj, key, {
          value: wrapper,
          writable: true,
          configurable: true,
          enumerable: descriptor.enumerable,
        });
      } catch {
        return false;
      }
    } else {
      // Normal property - direct assignment
      (obj as Record<string, unknown>)[key] = wrapper;
    }
    store.set(key, original);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely restores a method on an object.
 */
function safeRestoreMethod(obj: object, key: string, original: Function): void {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (descriptor && !descriptor.configurable) {
      return;
    }
    if (descriptor && descriptor.get && !descriptor.set) {
      Object.defineProperty(obj, key, {
        value: original,
        writable: true,
        configurable: true,
        enumerable: descriptor.enumerable ?? true,
      });
    } else {
      (obj as Record<string, unknown>)[key] = original;
    }
  } catch {
    // Ignore restore errors
  }
}

/**
 * Discovers and wraps all uncached fs methods.
 */
function patchUncachedMethods(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fsAny = fs as any;

  // Patch uncached sync methods on fs
  for (const key of Object.keys(fs)) {
    if (SKIP_METHODS.has(key)) continue;
    if (CACHED_SYNC_METHODS.has(key)) continue;

    const value = fsAny[key];
    if (typeof value === 'function') {
      const original = value.bind(fs);
      const wrapper = createTrackingWrapper(key, original, false);
      safePatchMethod(fs, key, wrapper, original, originalUncachedSync);
    }
  }

  // Patch uncached promise methods on fs.promises
  for (const key of Object.keys(fs.promises)) {
    if (SKIP_METHODS.has(key)) continue;
    if (CACHED_PROMISE_METHODS.has(key)) continue;

    const value = fsAny.promises[key];
    if (typeof value === 'function') {
      const original = value.bind(fs.promises);
      const wrapper = createTrackingWrapper(key, original, true);
      safePatchMethod(fs.promises, key, wrapper, original, originalUncachedPromises);
    }
  }
}

/**
 * Restores all uncached fs methods to their originals.
 */
function unpatchUncachedMethods(): void {
  // Restore sync methods
  for (const [key, fn] of originalUncachedSync) {
    safeRestoreMethod(fs, key, fn);
  }
  originalUncachedSync.clear();

  // Restore promise methods
  for (const [key, fn] of originalUncachedPromises) {
    safeRestoreMethod(fs.promises, key, fn);
  }
  originalUncachedPromises.clear();
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

  // Patch cached sync methods
  fsAny.readFileSync = cachedReadFileSync;
  fsAny.readdirSync = cachedReaddirSync;
  fsAny.existsSync = cachedExistsSync;
  fsAny.accessSync = cachedAccessSync;
  fsAny.opendirSync = cachedOpendirSync;

  // File descriptor operations - enabled by default
  // Uses small fd numbers (starting at 10) to avoid issues with high fd numbers
  const DISABLE_FD_CACHE = process.env.DISABLE_FD_CACHE === '1';
  if (DEBUG_FD_COMPARE) {
    // Comparison mode: use real fs but compare with what cache would return
    fsAny.openSync = compareOpenSync;
    fsAny.readSync = compareReadSync;
    fsAny.closeSync = compareCloseSync;
    fsAny.fstatSync = compareFstatSync;
  } else if (!DISABLE_FD_CACHE) {
    // Cached fd mode (DEFAULT): return small fd numbers, serve content from cache
    fsAny.openSync = cachedOpenSync;
    fsAny.readSync = cachedReadSync;
    fsAny.closeSync = cachedCloseSync;
    fsAny.fstatSync = cachedFstatSync;
  }
  // Env vars for fd operations:
  //   (default)           - cached fd mode with small fd numbers
  //   DISABLE_FD_CACHE=1  - disable fd caching entirely
  //   DEBUG_FD_COMPARE=1  - compare real vs cached, log mismatches

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

  // Patch cached promise methods
  fsAny.promises.readFile = cachedReadFile;
  fsAny.promises.readdir = cachedReaddir;
  fsAny.promises.stat = cachedStat;
  fsAny.promises.lstat = cachedLstat;
  fsAny.promises.realpath = cachedRealpathPromise;
  fsAny.promises.access = cachedAccessPromise;
  fsAny.promises.opendir = cachedOpendirPromise;

  // Patch all uncached methods for tracking
  patchUncachedMethods();

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

  // Restore cached sync methods
  fsAny.readFileSync = originalFs.readFileSync;
  fsAny.readdirSync = originalFs.readdirSync;
  fsAny.existsSync = originalFs.existsSync;
  fsAny.accessSync = originalFs.accessSync;
  fsAny.opendirSync = originalFs.opendirSync;

  // File descriptor operations - restore unless disabled
  const DISABLE_FD_CACHE = process.env.DISABLE_FD_CACHE === '1';
  if (!DISABLE_FD_CACHE || DEBUG_FD_COMPARE) {
    fsAny.openSync = originalFs.openSync;
    fsAny.readSync = originalFs.readSync;
    fsAny.closeSync = originalFs.closeSync;
    fsAny.fstatSync = originalFs.fstatSync;
    realFdPaths.clear();
    fdMap.clear();
    nextFakeFd = 10000;
  }

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

  // Restore cached promise methods
  fsAny.promises.readFile = originalFsPromises.readFile;
  fsAny.promises.readdir = originalFsPromises.readdir;
  fsAny.promises.stat = originalFsPromises.stat;
  fsAny.promises.lstat = originalFsPromises.lstat;
  fsAny.promises.realpath = originalFsPromises.realpath;
  fsAny.promises.access = originalFsPromises.access;
  fsAny.promises.opendir = originalFsPromises.opendir;

  // Restore all uncached methods
  unpatchUncachedMethods();

  // Clear fd tracking
  fdMap.clear();
  nextFakeFd = 10000;

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
