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
import { sonarjs } from './archive-proto.js';

export const FS_CACHE_MAGIC = 'sonarjs-filesystem-cache';
export const FS_CACHE_FORMAT_VERSION = 5;

const protobufArchive = sonarjs.fscache.Archive;

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
  writeSync: fs.writeSync.bind(fs),
};

function writeFileWithNativePrimitives(filePath, bytes, mode) {
  const descriptor = nativeFs.openSync(filePath, 'w', mode);
  try {
    let offset = 0;
    while (offset < bytes.length) {
      offset += nativeFs.writeSync(descriptor, bytes, offset, bytes.length - offset, null);
    }
  } finally {
    nativeFs.closeSync(descriptor);
  }
}

const MAP_FIELDS = ['access', 'directories', 'opens', 'readlinks', 'realpaths', 'stats'];

export const FS_TYPE_METHODS = Object.freeze({
  blockDevice: 'isBlockDevice',
  characterDevice: 'isCharacterDevice',
  directory: 'isDirectory',
  fifo: 'isFIFO',
  file: 'isFile',
  socket: 'isSocket',
  symbolicLink: 'isSymbolicLink',
});
const STAT_TYPES = Object.keys(FS_TYPE_METHODS);
export const DIRENT_TYPES = [
  'unknown',
  ...['file', 'directory', 'symbolicLink', 'blockDevice', 'characterDevice', 'fifo', 'socket'],
];

function restoreFsError(error) {
  return Object.fromEntries(Object.entries(error).filter(([, value]) => value !== null));
}

function typedVoid(entries = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok ? { success: {} } : { error: outcome.error }),
  }));
}

function restoreVoid(entries) {
  return Object.fromEntries(
    entries.map(entry => [
      entry.key,
      entry.result === 'success'
        ? { ok: true, value: null }
        : { ok: false, error: restoreFsError(entry.error) },
    ]),
  );
}

function typedStats(entries = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok
      ? {
          value: {
            ...outcome.value.fields,
            types: STAT_TYPES.reduce(
              (mask, type, index) => mask | (outcome.value.types[type] ? 1 << index : 0),
              0,
            ),
          },
        }
      : { error: outcome.error }),
  }));
}

function restoreStats(entries) {
  return Object.fromEntries(
    entries.map(entry => [
      entry.key,
      entry.result === 'value'
        ? {
            ok: true,
            value: {
              fields: Object.fromEntries(
                Object.entries(entry.value).filter(
                  ([field, value]) => field !== 'types' && value !== null,
                ),
              ),
              types: Object.fromEntries(
                STAT_TYPES.map((type, index) => [type, Boolean(entry.value.types & (1 << index))]),
              ),
            },
          }
        : { ok: false, error: restoreFsError(entry.error) },
    ]),
  );
}

function typedDirectories(entries = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok
      ? {
          value: {
            entries: outcome.value.map(entry => ({
              dirent: entry.kind === 'dirent',
              nameIsBuffer: entry.name.kind === 'buffer',
              name: Buffer.from(entry.name.value, entry.name.kind === 'buffer' ? 'base64' : 'utf8'),
              type: DIRENT_TYPES.indexOf(entry.type),
              parentPath: entry.parentPath && {
                relative: entry.parentPath.kind === 'relative',
                path: entry.parentPath.path,
              },
            })),
          },
        }
      : { error: outcome.error }),
  }));
}

function restoreDirectories(entries) {
  return Object.fromEntries(
    entries.map(entry => [
      entry.key,
      entry.result === 'value'
        ? {
            ok: true,
            value: entry.value.entries.map(value => ({
              kind: value.dirent ? 'dirent' : 'name',
              name: {
                kind: value.nameIsBuffer ? 'buffer' : 'string',
                value: Buffer.from(value.name).toString(value.nameIsBuffer ? 'base64' : 'utf8'),
              },
              ...(value.dirent ? { type: DIRENT_TYPES[value.type] } : {}),
              ...(value.parentPath
                ? {
                    parentPath: {
                      kind: value.parentPath.relative ? 'relative' : 'absolute',
                      path: value.parentPath.path,
                    },
                  }
                : {}),
            })),
          }
        : { ok: false, error: restoreFsError(entry.error) },
    ]),
  );
}

function typedPaths(entries = {}) {
  return Object.entries(entries).map(([key, outcome]) =>
    outcome.ok
      ? {
          key,
          value: {
            relative: outcome.value.path.kind === 'relative',
            path: outcome.value.path.path,
          },
        }
      : { key, error: outcome.error },
  );
}

function restorePaths(entries) {
  return Object.fromEntries(
    entries.map(entry => [
      entry.key,
      entry.result === 'value'
        ? {
            ok: true,
            value: {
              path: {
                kind: entry.value.relative ? 'relative' : 'absolute',
                path: entry.value.path,
              },
            },
          }
        : { ok: false, error: restoreFsError(entry.error) },
    ]),
  );
}

function typedNames(entries = {}) {
  return Object.entries(entries).map(([key, outcome]) =>
    outcome.ok
      ? {
          key,
          value: {
            buffer: outcome.value.kind === 'buffer',
            value: Buffer.from(
              outcome.value.value,
              outcome.value.kind === 'buffer' ? 'base64' : 'utf8',
            ),
          },
        }
      : { key, error: outcome.error },
  );
}

function restoreNames(entries) {
  return Object.fromEntries(
    entries.map(entry => [
      entry.key,
      entry.result === 'value'
        ? {
            ok: true,
            value: {
              kind: entry.value.buffer ? 'buffer' : 'string',
              value: Buffer.from(entry.value.value).toString(
                entry.value.buffer ? 'base64' : 'utf8',
              ),
            },
          }
        : { ok: false, error: restoreFsError(entry.error) },
    ]),
  );
}

function serializeProtobufDocument(document) {
  const missingPaths = document.entries
    .filter(({ node }) => Object.keys(node).length === 1 && node.exists === false)
    .map(({ path }) => path);
  return protobufArchive
    .encode({
      ...document,
      missingPaths,
      entries: document.entries
        .filter(({ node }) => !(Object.keys(node).length === 1 && node.exists === false))
        .map(({ path, node }) => {
          const { content } = node;
          const unsupportedFields = Object.keys(node).filter(
            field => !['exists', 'linkExists', 'content', ...MAP_FIELDS].includes(field),
          );
          if (unsupportedFields.length > 0) {
            throw new TypeError(
              `Filesystem cache path '${path}' has unsupported fields: ${unsupportedFields.join(', ')}`,
            );
          }
          const entry = {
            path,
            exists: node.exists,
            linkExists: node.linkExists,
            stats: typedStats(node.stats),
            access: typedVoid(node.access),
            opens: typedVoid(node.opens),
            directories: typedDirectories(node.directories),
            realpaths: typedPaths(node.realpaths),
            readlinks: typedNames(node.readlinks),
          };
          if (!content) return entry;
          if (!content.ok) {
            return {
              ...entry,
              contentError: content.error,
            };
          }
          return {
            ...entry,
            content: Buffer.isBuffer(content.value)
              ? content.value
              : Buffer.from(content.value, 'base64'),
          };
        }),
    })
    .finish();
}

function deserializeProtobufDocument(bytes) {
  const document = protobufArchive.decode(bytes);
  return {
    magic: document.magic,
    formatVersion: document.formatVersion,
    analyzerVersion: document.analyzerVersion,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    missingPaths: document.missingPaths,
    entries: document.entries.map(entry => {
      const node = {};
      if (entry.exists !== null) node.exists = entry.exists;
      if (entry.linkExists !== null) node.linkExists = entry.linkExists;
      if (entry.stats.length) node.stats = restoreStats(entry.stats);
      if (entry.access.length) node.access = restoreVoid(entry.access);
      if (entry.opens.length) node.opens = restoreVoid(entry.opens);
      if (entry.directories.length) node.directories = restoreDirectories(entry.directories);
      if (entry.realpaths.length) node.realpaths = restorePaths(entry.realpaths);
      if (entry.readlinks.length) node.readlinks = restoreNames(entry.readlinks);
      if (entry.contentResult === 'content') {
        node.content = {
          ok: true,
          value: Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content),
        };
      } else if (entry.contentResult === 'contentError') {
        node.content = {
          ok: false,
          error: restoreFsError(entry.contentError),
        };
      }
      return { path: entry.path, node };
    }),
  };
}

function createNode(node = {}) {
  const result = {};
  if (node.exists !== undefined) {
    result.exists = node.exists;
  }
  if (node.linkExists !== undefined) {
    result.linkExists = node.linkExists;
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
  if (node.linkExists !== undefined) {
    result.linkExists = node.linkExists;
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
  throw new FsCacheArchiveError(`Unsupported filesystem cache operation: ${operation}`);
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

function observesLink(operation) {
  return operation.startsWith('lstat:') || operation.startsWith('readlink:');
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
    this.rootPrefix = this.rootDir.endsWith(path.sep) ? this.rootDir : `${this.rootDir}${path.sep}`;
    this.mode = mode;
    this.strict = strict;
    this.analyzerVersion = analyzerVersion || undefined;
    this.createdAt = new Date().toISOString();
    this.entries = new Map();
    this.missingPaths = new Set();
    this.pathKeys = new Map();
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
      const bytes = gunzipSync(compressed);
      document = deserializeProtobufDocument(bytes);
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
    for (const missingPath of document.missingPaths || []) {
      this.missingPaths.add(missingPath);
    }
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

    const cachedKey = this.pathKeys.get(filePath);
    if (cachedKey !== undefined) {
      return cachedKey;
    }

    let relativePath;
    const needsNormalization =
      filePath.includes(`${path.sep}.${path.sep}`) ||
      filePath.endsWith(`${path.sep}.`) ||
      filePath.includes(`${path.sep}..${path.sep}`) ||
      filePath.endsWith(`${path.sep}..`) ||
      filePath.includes(`${path.sep}${path.sep}`);
    if (path.isAbsolute(filePath) && !needsNormalization) {
      if (filePath === this.rootDir) {
        relativePath = '';
      } else if (filePath.startsWith(this.rootPrefix)) {
        relativePath = filePath.slice(this.rootPrefix.length);
      } else {
        return undefined;
      }
    } else {
      relativePath = path.relative(this.rootDir, path.resolve(filePath));
    }
    if (
      relativePath === '..' ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      return undefined;
    }
    const key = relativePath === '' ? '.' : relativePath.split(path.sep).join('/');
    this.pathKeys.set(filePath, key);
    return key;
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
      node = this.missingPaths.delete(key) ? createNode({ exists: false }) : createNode();
      this.entries.set(key, node);
    }

    const missing = isMissingOutcome(operation, outcome);
    const linkOperation = observesLink(operation);
    if (operation === 'exists' && outcome.ok) {
      node.exists = Boolean(outcome.value);
      if (outcome.value) {
        node.linkExists = true;
      }
    } else if (missing) {
      if (linkOperation) {
        // A missing directory entry also means there is no target to follow.
        node.linkExists = false;
        node.exists = false;
      } else {
        // The target may be missing while a dangling symbolic link still exists.
        node.exists = false;
      }
    } else if (outcome.ok) {
      node.linkExists = true;
      if (!linkOperation) {
        node.exists = true;
      }
    }

    if (operation !== 'exists' && !missing) {
      writeSlot(node, operationSlot(operation), outcome);
    }
    this.dirty = true;
  }

  getExists(key, operation = '') {
    const node = this.entries.get(key);
    if (!node && this.missingPaths.has(key)) {
      return false;
    }
    return observesLink(operation) ? node?.linkExists : node?.exists;
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
      paths: this.entries.size + this.missingPaths.size,
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
      const ownMissingPaths = this.missingPaths;
      this.entries = new Map();
      this.missingPaths = new Set();
      let mergedEntries;
      let mergedMissingPaths;
      try {
        this.load();
        mergedEntries = this.entries;
        mergedMissingPaths = this.missingPaths;
      } catch (error) {
        if (error?.incompatible) {
          mergedEntries = new Map();
          mergedMissingPaths = new Set();
        } else {
          throw error;
        }
      } finally {
        this.entries = ownEntries;
        this.missingPaths = ownMissingPaths;
      }
      for (const missingPath of ownMissingPaths) {
        mergedEntries.delete(missingPath);
        mergedMissingPaths.add(missingPath);
      }
      for (const [entryPath, node] of ownEntries) {
        mergedMissingPaths.delete(entryPath);
        mergedEntries.set(entryPath, mergeNodes(mergedEntries.get(entryPath), node));
      }

      const entries = [
        ...[...mergedMissingPaths].map(entryPath => [entryPath, { exists: false }]),
        ...mergedEntries.entries(),
      ]
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
      const serialized = serializeProtobufDocument(document);
      const bytes = gzipSync(serialized, { mtime: 0 });
      const temporaryPath = `${this.archivePath}.${process.pid}.${randomUUID()}.tmp`;
      try {
        writeFileWithNativePrimitives(temporaryPath, bytes, ARCHIVE_FILE_MODE);
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
