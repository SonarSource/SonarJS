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
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

export const FS_CACHE_MAGIC = 'sonarjs-filesystem-cache';
export const FS_CACHE_FORMAT_VERSION = 3;

const ARCHIVE_FILE_MODE = 0o600;
const LOCK_RETRY_DELAY_MS = 10;
const LOCK_RETRY_LIMIT = 1_000;
const LOCK_STALE_AGE_MS = LOCK_RETRY_DELAY_MS * LOCK_RETRY_LIMIT;

const nativeFs = {
  closeSync: fs.closeSync.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  mkdirSync: fs.mkdirSync.bind(fs),
  openSync: fs.openSync.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
  renameSync: fs.renameSync.bind(fs),
  statSync: fs.statSync.bind(fs),
  unlinkSync: fs.unlinkSync.bind(fs),
  writeFileSync: fs.writeFileSync.bind(fs),
};

const MAP_FIELDS = ['access', 'directories', 'opens', 'readlinks', 'realpaths', 'stats', 'other'];

function createNode(node = {}) {
  const result = {};
  if (node.exists !== undefined) {
    result.exists = node.exists;
  }
  if (node.content !== undefined) {
    result.content = node.content;
  }
  for (const field of MAP_FIELDS) {
    if (node[field] && typeof node[field] === 'object') {
      result[field] = { ...node[field] };
    }
  }
  return result;
}

function mergeNodes(base = {}, update = {}) {
  const result = { ...base, ...update };
  for (const field of MAP_FIELDS) {
    if (base[field] || update[field]) {
      result[field] = { ...base[field], ...update[field] };
    }
  }
  return result;
}

function sortedNode(node) {
  const result = {};
  if (node.exists !== undefined) {
    result.exists = node.exists;
  }
  if (node.content !== undefined) {
    result.content = node.content;
  }
  for (const field of MAP_FIELDS) {
    if (node[field]) {
      result[field] = Object.fromEntries(
        Object.entries(node[field]).sort(([left], [right]) => left.localeCompare(right)),
      );
    }
  }
  return result;
}

function operationSlot(operation) {
  const [name, ...parts] = operation.split(':');
  if (name === 'readFile') {
    return { field: 'content' };
  }
  if (name === 'stat' || name === 'fstat' || name === 'lstat') {
    const family = name === 'fstat' ? 'stat' : name;
    return { field: 'stats', key: `${family}:${parts[0] || 'number'}` };
  }
  if (name === 'readdir') {
    const [encoding = 'utf8', withFileTypes = 'false', recursive = 'false'] = parts;
    const scope = recursive === 'true' ? 'readdir-recursive' : 'flat';
    const kind = withFileTypes === 'true' ? 'entries' : 'names';
    return { field: 'directories', key: `${scope}:${encoding}:${kind}` };
  }
  if (name === 'opendir') {
    const [encoding = 'utf8', recursive = 'false'] = parts;
    const scope = recursive === 'true' ? 'opendir-recursive' : 'flat';
    return { field: 'directories', key: `${scope}:${encoding}:entries` };
  }
  if (name === 'access') {
    return { field: 'access', key: parts[0] || '0' };
  }
  if (name === 'realpath' || name === 'realpath.native') {
    return { field: 'realpaths', key: name };
  }
  if (name === 'readlink') {
    return { field: 'readlinks', key: parts[0] || 'utf8' };
  }
  if (name === 'open') {
    return { field: 'opens', key: parts.join(':') || 'r' };
  }
  return { field: 'other', key: operation };
}

function readSlot(node, slot) {
  return slot.key === undefined ? node[slot.field] : node[slot.field]?.[slot.key];
}

function writeSlot(node, slot, outcome) {
  if (slot.key === undefined) {
    node[slot.field] = outcome;
    return;
  }
  node[slot.field] ||= {};
  node[slot.field][slot.key] = outcome;
}

function isMissingOutcome(operation, outcome) {
  return (
    (!outcome.ok && outcome.error?.code === 'ENOENT') ||
    ((operation.startsWith('stat:') || operation.startsWith('lstat:')) &&
      outcome.ok &&
      outcome.value === null)
  );
}

function namesFromEntries(outcome) {
  if (!outcome?.ok) {
    return outcome;
  }
  return {
    ok: true,
    value: outcome.value.map(entry => ({ kind: 'name', name: entry.name })),
  };
}

export class FsCacheArchiveError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'FsCacheArchiveError';
    this.code = 'ERR_SONARJS_FS_CACHE_ARCHIVE';
    this.incompatible = options?.incompatible === true;
  }
}

function removeStaleLock(lockPath) {
  try {
    const age = Date.now() - nativeFs.statSync(lockPath).mtimeMs;
    if (age < LOCK_STALE_AGE_MS) {
      return false;
    }
    nativeFs.unlinkSync(lockPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

function acquireLock(lockPath, archivePath) {
  const lockWaiter = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt++) {
    try {
      return nativeFs.openSync(lockPath, 'wx', ARCHIVE_FILE_MODE);
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      if (removeStaleLock(lockPath)) {
        continue;
      }
      if (attempt === LOCK_RETRY_LIMIT - 1) {
        throw new FsCacheArchiveError(
          `Timed out waiting to write filesystem cache archive: ${archivePath}`,
          { cause: error },
        );
      }
      Atomics.wait(lockWaiter, 0, 0, LOCK_RETRY_DELAY_MS);
    }
  }
  throw new FsCacheArchiveError(
    `Timed out waiting to write filesystem cache archive: ${archivePath}`,
  );
}

/**
 * A versioned, portable record of filesystem observations.
 *
 * Paths are stored relative to rootDir. The archive deliberately contains observations rather
 * than a copy of the whole project: the hook records exactly the filesystem context consumed by
 * analysis and replays those observations from another checkout root.
 */
export class FsCacheArchive {
  constructor({ archivePath, rootDir, mode, strict = false, analyzerVersion }) {
    if (mode !== 'record' && mode !== 'replay') {
      throw new FsCacheArchiveError(`Unsupported filesystem cache mode: ${mode}`);
    }
    if (!archivePath) {
      throw new FsCacheArchiveError('The filesystem cache archive path is required');
    }
    if (!rootDir) {
      throw new FsCacheArchiveError('The filesystem cache root directory is required');
    }

    this.archivePath = path.resolve(archivePath);
    this.rootDir = path.resolve(rootDir);
    this.mode = mode;
    this.strict = strict;
    this.analyzerVersion = analyzerVersion || undefined;
    this.createdAt = new Date().toISOString();
    this.entries = new Map();
    this.dirty = false;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  load() {
    if (!nativeFs.existsSync(this.archivePath)) {
      if (this.mode === 'replay') {
        throw new FsCacheArchiveError(
          `Filesystem cache archive does not exist: ${this.archivePath}`,
        );
      }
      return;
    }

    let document;
    try {
      const compressed = nativeFs.readFileSync(this.archivePath);
      document = JSON.parse(gunzipSync(compressed).toString('utf8'));
    } catch (error) {
      throw new FsCacheArchiveError(`Cannot read filesystem cache archive: ${this.archivePath}`, {
        cause: error,
      });
    }

    if (document.magic !== FS_CACHE_MAGIC) {
      throw new FsCacheArchiveError(`Not a SonarJS filesystem cache archive: ${this.archivePath}`);
    }
    if (document.formatVersion !== FS_CACHE_FORMAT_VERSION) {
      throw new FsCacheArchiveError(
        `Unsupported filesystem cache format ${document.formatVersion}; expected ${FS_CACHE_FORMAT_VERSION}`,
        { incompatible: true },
      );
    }
    if (this.analyzerVersion && document.analyzerVersion !== this.analyzerVersion) {
      throw new FsCacheArchiveError(
        `Filesystem cache analyzer version ${document.analyzerVersion || '<unspecified>'} does not match ${this.analyzerVersion}`,
        { incompatible: true },
      );
    }
    if (!Array.isArray(document.entries)) {
      throw new FsCacheArchiveError('Filesystem cache archive has no entries array');
    }

    this.createdAt = document.createdAt || this.createdAt;
    for (const entry of document.entries) {
      if (
        !entry ||
        typeof entry.path !== 'string' ||
        !entry.node ||
        typeof entry.node !== 'object'
      ) {
        throw new FsCacheArchiveError('Filesystem cache archive contains an invalid entry');
      }
      this.entries.set(entry.path, createNode(entry.node));
    }
  }

  keyFor(input) {
    let filePath;
    if (typeof input === 'string') {
      filePath = input;
    } else if (Buffer.isBuffer(input)) {
      filePath = input.toString();
    } else if (input instanceof URL && input.protocol === 'file:') {
      filePath = fileURLToPath(input);
    } else {
      return undefined;
    }

    const absolutePath = path.resolve(filePath);
    const relativePath = path.relative(this.rootDir, absolutePath);
    if (
      relativePath === '..' ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      return undefined;
    }
    return relativePath === '' ? '.' : relativePath.split(path.sep).join('/');
  }

  absolutePathFor(key) {
    return key === '.' ? this.rootDir : path.join(this.rootDir, ...key.split('/'));
  }

  encodePortablePath(filePath) {
    const key = this.keyFor(filePath);
    return key === undefined
      ? { kind: 'absolute', path: String(filePath) }
      : { kind: 'relative', path: key };
  }

  decodePortablePath(portablePath) {
    return portablePath.kind === 'relative'
      ? this.absolutePathFor(portablePath.path)
      : portablePath.path;
  }

  get(key, operation) {
    const node = this.entries.get(key);
    if (!node) {
      return undefined;
    }
    if (operation === 'exists' && node.exists !== undefined) {
      return { ok: true, value: node.exists };
    }

    const slot = operationSlot(operation);
    let outcome = readSlot(node, slot);
    if (
      outcome === undefined &&
      operation === 'open:r' &&
      node.content?.ok &&
      node.stats?.['stat:number']?.ok &&
      node.stats?.['stat:bigint']?.ok
    ) {
      outcome = { ok: true, value: null };
    }
    if (outcome === undefined && operation.startsWith('readdir:')) {
      const [name, encoding = 'utf8', withFileTypes = 'false', recursive = 'false'] =
        operation.split(':');
      if (name === 'readdir' && withFileTypes === 'false' && recursive === 'false') {
        outcome = namesFromEntries(node.directories?.[`flat:${encoding}:entries`]);
      }
    }
    return outcome;
  }

  set(key, operation, outcome) {
    let node = this.entries.get(key);
    if (!node) {
      node = createNode();
      this.entries.set(key, node);
    }

    if (operation === 'exists' && outcome.ok) {
      node.exists = Boolean(outcome.value);
    } else if (isMissingOutcome(operation, outcome)) {
      node.exists = false;
    } else if (outcome.ok) {
      node.exists = true;
    }

    if (operation !== 'exists' && !isMissingOutcome(operation, outcome)) {
      writeSlot(node, operationSlot(operation), outcome);
    }
    this.dirty = true;
  }

  getExists(key) {
    return this.entries.get(key)?.exists;
  }

  recordCacheHit() {
    this.cacheHits += 1;
  }

  recordCacheMiss() {
    this.cacheMisses += 1;
  }

  getStatistics() {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      paths: this.entries.size,
    };
  }

  flush() {
    if (this.mode !== 'record' || !this.dirty) {
      return;
    }

    const directory = path.dirname(this.archivePath);
    nativeFs.mkdirSync(directory, { recursive: true });
    const lockPath = `${this.archivePath}.lock`;
    const lockDescriptor = acquireLock(lockPath, this.archivePath);
    try {
      const ownEntries = this.entries;
      this.entries = new Map();
      let mergedEntries;
      try {
        this.load();
        mergedEntries = this.entries;
      } catch (error) {
        if (error?.incompatible) {
          mergedEntries = new Map();
        } else {
          throw error;
        }
      } finally {
        this.entries = ownEntries;
      }
      for (const [entryPath, node] of ownEntries) {
        mergedEntries.set(entryPath, mergeNodes(mergedEntries.get(entryPath), node));
      }

      const entries = [...mergedEntries.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([entryPath, node]) => ({
          path: entryPath,
          node: sortedNode(node),
        }));
      const document = {
        magic: FS_CACHE_MAGIC,
        formatVersion: FS_CACHE_FORMAT_VERSION,
        analyzerVersion: this.analyzerVersion,
        createdAt: this.createdAt,
        updatedAt: new Date().toISOString(),
        entries,
      };
      const bytes = gzipSync(Buffer.from(JSON.stringify(document)), { mtime: 0 });
      const temporaryPath = `${this.archivePath}.${process.pid}.${randomUUID()}.tmp`;
      try {
        nativeFs.writeFileSync(temporaryPath, bytes, { mode: ARCHIVE_FILE_MODE });
        nativeFs.renameSync(temporaryPath, this.archivePath);
        this.dirty = false;
      } finally {
        if (nativeFs.existsSync(temporaryPath)) {
          nativeFs.unlinkSync(temporaryPath);
        }
      }
    } finally {
      nativeFs.closeSync(lockDescriptor);
      if (nativeFs.existsSync(lockPath)) {
        nativeFs.unlinkSync(lockPath);
      }
    }
  }
}
