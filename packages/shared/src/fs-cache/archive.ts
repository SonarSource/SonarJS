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
import { normalizePath } from '../helpers/path-normalization.js';
import { sonarjs } from './archive-proto.js';

const FS_CACHE_MAGIC = 'sonarjs-filesystem-cache';
export const FS_CACHE_FORMAT_VERSION = 5;

const protobufArchive = sonarjs.fscache.Archive;

const ARCHIVE_FILE_MODE = 0o600;
const LOCK_RETRY_DELAY_MS = 10;
const LOCK_RETRY_LIMIT = 1_000;
const LOCK_STALE_AGE_MS = LOCK_RETRY_DELAY_MS * LOCK_RETRY_LIMIT;

export type FsCacheErrorSnapshot = {
  name: string;
  message: string;
  code?: string;
  errno?: number;
  syscall?: string;
};
export type FsCacheOutcome<T> = { ok: true; value: T } | { ok: false; error: FsCacheErrorSnapshot };
export type PortablePath = { kind: 'absolute' | 'relative'; path: string };
export type CachedName = { kind: 'buffer'; value: string } | { kind: 'string'; value: string };
export type CachedStat = {
  fields: Record<string, string | undefined>;
  types: Record<string, boolean>;
};
export type CachedDirectoryEntry =
  | { kind: 'name'; name: CachedName }
  | { kind: 'dirent'; name: CachedName; type: string; parentPath: PortablePath };

type OutcomeMap<T> = Record<string, FsCacheOutcome<T>>;
type CacheNode = {
  exists?: boolean;
  linkExists?: boolean;
  content?: FsCacheOutcome<Buffer | string>;
  access?: OutcomeMap<null>;
  directories?: OutcomeMap<CachedDirectoryEntry[]>;
  opens?: OutcomeMap<null>;
  readlinks?: OutcomeMap<CachedName>;
  realpaths?: OutcomeMap<{ path: PortablePath }>;
  stats?: OutcomeMap<CachedStat>;
};
type MapField = keyof Pick<
  CacheNode,
  'access' | 'directories' | 'opens' | 'readlinks' | 'realpaths' | 'stats'
>;
type OperationSlot = { field: 'content' } | { field: MapField; key: string };
type ArchiveMode = 'record' | 'replay';
export type ArchiveOptions = { archivePath: string; rootDir: string };
type ArchiveEntry = { path: string; node: CacheNode };
type ArchiveDocument = {
  magic: string;
  formatVersion: number;
  createdAt: string;
  updatedAt: string;
  entries: ArchiveEntry[];
  missingPaths?: string[];
};

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

function writeFileWithNativePrimitives(filePath: fs.PathLike, bytes: Uint8Array, mode: number) {
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

const MAP_FIELDS: readonly MapField[] = [
  'access',
  'directories',
  'opens',
  'readlinks',
  'realpaths',
  'stats',
];

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
  'file',
  'directory',
  'symbolicLink',
  'blockDevice',
  'characterDevice',
  'fifo',
  'socket',
];

function required<T>(value: T | null | undefined, field: string): T {
  if (value === null || value === undefined) {
    throw new FsCacheArchiveError(`Filesystem cache archive is missing ${field}`);
  }
  return value;
}

function restoreFsError(error: sonarjs.fscache.FsError.$Properties): FsCacheErrorSnapshot {
  return Object.fromEntries(
    Object.entries(error).filter(([, value]) => value !== null),
  ) as FsCacheErrorSnapshot;
}

function typedVoid(entries: OutcomeMap<null> = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok ? { success: {} } : { error: outcome.error }),
  }));
}

function restoreVoid(entries: sonarjs.fscache.VoidObservation.$Properties[]): OutcomeMap<null> {
  return Object.fromEntries(
    entries.map(entry => [
      entry.key,
      entry.result === 'success'
        ? { ok: true, value: null }
        : { ok: false, error: restoreFsError(required(entry.error, 'void observation error')) },
    ]),
  ) as OutcomeMap<null>;
}

function typedStats(entries: OutcomeMap<CachedStat> = {}) {
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

function restoreStats(
  entries: sonarjs.fscache.StatObservation.$Properties[],
): OutcomeMap<CachedStat> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          { ok: false, error: restoreFsError(required(entry.error, 'stat observation error')) },
        ];
      }
      const value = required(entry.value, 'stat observation value');
      return [
        entry.key,
        {
          ok: true,
          value: {
            fields: Object.fromEntries(
              Object.entries(value).filter(
                ([field, fieldValue]) => field !== 'types' && fieldValue !== null,
              ),
            ),
            types: Object.fromEntries(
              STAT_TYPES.map((type, index) => [type, Boolean((value.types ?? 0) & (1 << index))]),
            ),
          },
        },
      ];
    }),
  ) as OutcomeMap<CachedStat>;
}

function typedDirectories(entries: OutcomeMap<CachedDirectoryEntry[]> = {}) {
  return Object.entries(entries).map(([key, outcome]) => ({
    key,
    ...(outcome.ok
      ? {
          value: {
            entries: outcome.value.map(entry => {
              const common = {
                dirent: entry.kind === 'dirent',
                nameIsBuffer: entry.name.kind === 'buffer',
                name: Buffer.from(
                  entry.name.value,
                  entry.name.kind === 'buffer' ? 'base64' : 'utf8',
                ),
              };
              return entry.kind === 'dirent'
                ? {
                    ...common,
                    type: DIRENT_TYPES.indexOf(entry.type),
                    parentPath: {
                      relative: entry.parentPath.kind === 'relative',
                      path: entry.parentPath.path,
                    },
                  }
                : common;
            }),
          },
        }
      : { error: outcome.error }),
  }));
}

function restoreDirectories(
  entries: sonarjs.fscache.DirectoryObservation.$Properties[],
): OutcomeMap<CachedDirectoryEntry[]> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          {
            ok: false,
            error: restoreFsError(required(entry.error, 'directory observation error')),
          },
        ];
      }
      const value = required(entry.value, 'directory observation value');
      return [
        entry.key,
        {
          ok: true,
          value: required(value.entries, 'directory entries').map(directoryEntry => ({
            kind: directoryEntry.dirent ? 'dirent' : 'name',
            name: {
              kind: directoryEntry.nameIsBuffer ? 'buffer' : 'string',
              value: Buffer.from(required(directoryEntry.name, 'directory entry name')).toString(
                directoryEntry.nameIsBuffer ? 'base64' : 'utf8',
              ),
            },
            ...(directoryEntry.dirent ? { type: DIRENT_TYPES[directoryEntry.type ?? 0] } : {}),
            ...(directoryEntry.parentPath
              ? {
                  parentPath: {
                    kind: directoryEntry.parentPath.relative ? 'relative' : 'absolute',
                    path: directoryEntry.parentPath.path,
                  },
                }
              : {}),
          })),
        },
      ];
    }),
  ) as OutcomeMap<CachedDirectoryEntry[]>;
}

function typedPaths(entries: OutcomeMap<{ path: PortablePath }> = {}) {
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

function restorePaths(
  entries: sonarjs.fscache.PathObservation.$Properties[],
): OutcomeMap<{ path: PortablePath }> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          { ok: false, error: restoreFsError(required(entry.error, 'path observation error')) },
        ];
      }
      const value = required(entry.value, 'path observation value');
      return [
        entry.key,
        {
          ok: true,
          value: {
            path: {
              kind: value.relative ? 'relative' : 'absolute',
              path: required(value.path, 'portable path'),
            },
          },
        },
      ];
    }),
  ) as OutcomeMap<{ path: PortablePath }>;
}

function typedNames(entries: OutcomeMap<CachedName> = {}) {
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

function restoreNames(
  entries: sonarjs.fscache.NameObservation.$Properties[],
): OutcomeMap<CachedName> {
  return Object.fromEntries(
    entries.map(entry => {
      if (entry.result !== 'value') {
        return [
          entry.key,
          { ok: false, error: restoreFsError(required(entry.error, 'name observation error')) },
        ];
      }
      const value = required(entry.value, 'name observation value');
      return [
        entry.key,
        {
          ok: true,
          value: {
            kind: value.buffer ? 'buffer' : 'string',
            value: Buffer.from(required(value.value, 'name observation bytes')).toString(
              value.buffer ? 'base64' : 'utf8',
            ),
          },
        },
      ];
    }),
  ) as OutcomeMap<CachedName>;
}

function serializeProtobufDocument(document: ArchiveDocument) {
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
          if (!content) {
            return entry;
          }
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

function deserializeProtobufDocument(bytes: Uint8Array) {
  const document = protobufArchive.decode(bytes);
  return {
    magic: document.magic,
    formatVersion: document.formatVersion,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    missingPaths: document.missingPaths,
    entries: document.entries.map(entry => {
      const node: CacheNode = {};
      if (entry.exists !== null) {
        node.exists = entry.exists;
      }
      if (entry.linkExists !== null) {
        node.linkExists = entry.linkExists;
      }
      if (entry.stats?.length) {
        node.stats = restoreStats(entry.stats);
      }
      if (entry.access?.length) {
        node.access = restoreVoid(entry.access);
      }
      if (entry.opens?.length) {
        node.opens = restoreVoid(entry.opens);
      }
      if (entry.directories?.length) {
        node.directories = restoreDirectories(entry.directories);
      }
      if (entry.realpaths?.length) {
        node.realpaths = restorePaths(entry.realpaths);
      }
      if (entry.readlinks?.length) {
        node.readlinks = restoreNames(entry.readlinks);
      }
      if (entry.contentResult === 'content') {
        node.content = {
          ok: true,
          value: Buffer.isBuffer(entry.content)
            ? entry.content
            : Buffer.from(required(entry.content, 'content bytes')),
        };
      } else if (entry.contentResult === 'contentError') {
        node.content = {
          ok: false,
          error: restoreFsError(required(entry.contentError, 'content error')),
        };
      }
      return { path: required(entry.path, 'entry path'), node };
    }),
  };
}

function createNode(node: CacheNode = {}): CacheNode {
  const result: CacheNode = {};
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
      copyMapField(result, node, field);
    }
  }
  return result;
}

function mergeNodes(base: CacheNode = {}, update: CacheNode = {}): CacheNode {
  const result = { ...base, ...update };
  for (const field of MAP_FIELDS) {
    if (base[field] || update[field]) {
      mergeMapField(result, base, update, field);
    }
  }
  return result;
}

function sortedNode(node: CacheNode): CacheNode {
  const result: CacheNode = {};
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
      sortMapField(result, node, field);
    }
  }
  return result;
}

function copyMapField<K extends MapField>(target: CacheNode, source: CacheNode, field: K): void {
  target[field] = { ...source[field] } as CacheNode[K];
}

function mergeMapField<K extends MapField>(
  target: CacheNode,
  base: CacheNode,
  update: CacheNode,
  field: K,
): void {
  target[field] = { ...base[field], ...update[field] } as CacheNode[K];
}

function sortMapField<K extends MapField>(target: CacheNode, source: CacheNode, field: K): void {
  const entries = source[field];
  if (!entries) {
    return;
  }
  target[field] = Object.fromEntries(
    Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)),
  ) as CacheNode[K];
}

function operationSlot(operation: string): OperationSlot {
  const [name, ...parts] = operation.split(':');
  switch (name) {
    case 'readFile':
      return { field: 'content' };
    case 'stat':
    case 'lstat':
      return { field: 'stats', key: `${name}:${parts[0] || 'number'}` };
    case 'fstat':
      return { field: 'stats', key: `stat:${parts[0] || 'number'}` };
    case 'readdir': {
      const [encoding = 'utf8', withFileTypes = 'false', recursive = 'false'] = parts;
      const scope = recursive === 'true' ? 'readdir-recursive' : 'flat';
      const kind = withFileTypes === 'true' ? 'entries' : 'names';
      return { field: 'directories', key: `${scope}:${encoding}:${kind}` };
    }
    case 'opendir': {
      const [encoding = 'utf8', recursive = 'false'] = parts;
      const scope = recursive === 'true' ? 'opendir-recursive' : 'flat';
      return { field: 'directories', key: `${scope}:${encoding}:entries` };
    }
    case 'access':
      return { field: 'access', key: parts[0] || '0' };
    case 'realpath':
    case 'realpath.native':
      return { field: 'realpaths', key: name };
    case 'readlink':
      return { field: 'readlinks', key: parts[0] || 'utf8' };
    case 'open':
      return { field: 'opens', key: parts.join(':') || 'r' };
    default:
      throw new FsCacheArchiveError(`Unsupported filesystem cache operation: ${operation}`);
  }
}

function readSlot(node: CacheNode, slot: OperationSlot): FsCacheOutcome<unknown> | undefined {
  return slot.field === 'content' ? node.content : node[slot.field]?.[slot.key];
}

function writeSlot<T>(node: CacheNode, slot: OperationSlot, outcome: FsCacheOutcome<T>) {
  if (slot.field === 'content') {
    node.content = outcome as FsCacheOutcome<Buffer | string>;
    return;
  }
  const mapFields = node as Record<MapField, OutcomeMap<unknown> | undefined>;
  let entries = mapFields[slot.field] as OutcomeMap<T> | undefined;
  if (!entries) {
    entries = {};
    mapFields[slot.field] = entries as OutcomeMap<unknown>;
  }
  entries[slot.key] = outcome;
}

function isMissingOutcome(operation: string, outcome: FsCacheOutcome<unknown>) {
  return (
    (!outcome.ok && outcome.error?.code === 'ENOENT') ||
    ((operation.startsWith('stat:') || operation.startsWith('lstat:')) &&
      outcome.ok &&
      outcome.value === null)
  );
}

function observesLink(operation: string) {
  return operation.startsWith('lstat:') || operation.startsWith('readlink:');
}

function updateExistence(
  node: CacheNode,
  operation: string,
  outcome: FsCacheOutcome<unknown>,
  missing: boolean,
) {
  const linkOperation = observesLink(operation);
  if (operation === 'exists' && outcome.ok) {
    node.exists = Boolean(outcome.value);
    if (outcome.value) {
      node.linkExists = true;
    }
    return;
  }
  if (missing) {
    node.exists = false;
    if (linkOperation) {
      // A missing directory entry also means there is no target to follow.
      node.linkExists = false;
    }
    return;
  }
  if (outcome.ok) {
    node.linkExists = true;
    if (!linkOperation) {
      node.exists = true;
    }
  }
}

function namesFromEntries(
  outcome: FsCacheOutcome<CachedDirectoryEntry[]> | undefined,
): FsCacheOutcome<CachedDirectoryEntry[]> | undefined {
  if (!outcome?.ok) {
    return outcome;
  }
  return {
    ok: true,
    value: outcome.value.map(entry => ({ kind: 'name', name: entry.name })),
  };
}

class FsCacheArchiveError extends Error {
  code: string;
  incompatible: boolean;

  constructor(message: string, options?: ErrorOptions & { incompatible?: boolean }) {
    super(message, options);
    this.name = 'FsCacheArchiveError';
    this.code = 'ERR_SONARJS_FS_CACHE_ARCHIVE';
    this.incompatible = options?.incompatible === true;
  }
}

function removeStaleLock(lockPath: string) {
  try {
    const age = Date.now() - nativeFs.statSync(lockPath).mtimeMs;
    if (age < LOCK_STALE_AGE_MS) {
      return false;
    }
    nativeFs.unlinkSync(lockPath);
    return true;
  } catch (error: unknown) {
    const filesystemError = error as NodeJS.ErrnoException;
    if (filesystemError.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

function acquireLock(lockPath: string, archivePath: string) {
  const lockWaiter = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt++) {
    try {
      return nativeFs.openSync(lockPath, 'wx', ARCHIVE_FILE_MODE);
    } catch (error: unknown) {
      const filesystemError = error as NodeJS.ErrnoException;
      if (filesystemError.code !== 'EEXIST') {
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

function normalizeForComparison(filePath: string) {
  return path.sep === '\\' ? normalizePath(filePath) : filePath;
}

/**
 * A versioned, portable record of filesystem observations.
 *
 * Paths are stored relative to rootDir. The archive deliberately contains observations rather
 * than a copy of the whole project: the hook records exactly the filesystem context consumed by
 * analysis and replays those observations from another checkout root.
 */
export class FsCacheArchive {
  archivePath: string;
  rootDir: string;
  comparisonRootDir: string;
  comparisonRootPrefix: string;
  mode: ArchiveMode;
  createdAt: string;
  entries: Map<string, CacheNode>;
  missingPaths: Set<string>;
  pathKeys: Map<string, string>;
  dirty: boolean;
  cacheHits: number;
  cacheMisses: number;

  constructor({ archivePath, rootDir }: ArchiveOptions) {
    if (!archivePath) {
      throw new FsCacheArchiveError('The filesystem cache archive path is required');
    }
    if (!rootDir) {
      throw new FsCacheArchiveError('The filesystem cache root directory is required');
    }
    this.archivePath = path.resolve(archivePath);
    this.rootDir = path.resolve(rootDir);
    this.comparisonRootDir = normalizeForComparison(this.rootDir);
    this.comparisonRootPrefix = this.comparisonRootDir.endsWith('/')
      ? this.comparisonRootDir
      : `${this.comparisonRootDir}/`;
    this.mode = nativeFs.existsSync(this.archivePath) ? 'replay' : 'record';
    this.createdAt = new Date().toISOString();
    this.entries = new Map();
    this.missingPaths = new Set();
    this.pathKeys = new Map();
    this.dirty = false;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  load(): void {
    if (!nativeFs.existsSync(this.archivePath)) {
      if (this.mode === 'replay') {
        throw new FsCacheArchiveError(
          `Filesystem cache archive does not exist: ${this.archivePath}`,
        );
      }
      return;
    }

    let document: ArchiveDocument;
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

  keyFor(input: fs.PathLike): string | undefined {
    let filePath: string;
    if (typeof input === 'string') {
      filePath = input;
    } else if (Buffer.isBuffer(input)) {
      filePath = input.toString();
    } else if (input instanceof URL && input.protocol === 'file:') {
      filePath = fileURLToPath(input);
    } else {
      return undefined;
    }

    const inputPath = filePath;
    const cachedKey = this.pathKeys.get(inputPath);
    if (cachedKey !== undefined) {
      return cachedKey;
    }

    const comparisonFilePath = normalizeForComparison(filePath);
    let relativePath;
    const needsNormalization =
      comparisonFilePath.includes('/./') ||
      comparisonFilePath.endsWith('/.') ||
      comparisonFilePath.includes('/../') ||
      comparisonFilePath.endsWith('/..') ||
      comparisonFilePath.includes('//');
    if (path.isAbsolute(comparisonFilePath) && !needsNormalization) {
      if (comparisonFilePath === this.comparisonRootDir) {
        relativePath = '';
      } else if (comparisonFilePath.startsWith(this.comparisonRootPrefix)) {
        relativePath = comparisonFilePath.slice(this.comparisonRootPrefix.length);
      } else {
        return undefined;
      }
    } else {
      relativePath = normalizeForComparison(path.relative(this.rootDir, path.resolve(filePath)));
    }
    if (relativePath === '..' || relativePath.startsWith('../') || path.isAbsolute(relativePath)) {
      return undefined;
    }
    const key = relativePath === '' ? '.' : relativePath;
    this.pathKeys.set(inputPath, key);
    this.pathKeys.set(comparisonFilePath, key);
    return key;
  }

  absolutePathFor(key: string): string {
    return key === '.' ? this.rootDir : path.join(this.rootDir, ...key.split('/'));
  }

  encodePortablePath(filePath: fs.PathLike): PortablePath {
    const key = this.keyFor(filePath);
    return key === undefined
      ? { kind: 'absolute', path: String(filePath) }
      : { kind: 'relative', path: key };
  }

  decodePortablePath(portablePath: PortablePath): string {
    return portablePath.kind === 'relative'
      ? this.absolutePathFor(portablePath.path)
      : portablePath.path;
  }

  get<T = unknown>(key: string, operation: string): FsCacheOutcome<T> | undefined {
    const node = this.entries.get(key);
    if (!node) {
      return undefined;
    }
    if (operation === 'exists' && node.exists !== undefined) {
      return { ok: true, value: node.exists as T };
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
    return outcome as FsCacheOutcome<T> | undefined;
  }

  set<T>(key: string, operation: string, outcome: FsCacheOutcome<T>): void {
    let node = this.entries.get(key);
    if (!node) {
      node = this.missingPaths.delete(key) ? createNode({ exists: false }) : createNode();
      this.entries.set(key, node);
    }

    const missing = isMissingOutcome(operation, outcome);
    updateExistence(node, operation, outcome, missing);

    if (operation !== 'exists' && !missing) {
      writeSlot(node, operationSlot(operation), outcome);
    }
    this.dirty = true;
  }

  getExists(key: string, operation = ''): boolean | undefined {
    const node = this.entries.get(key);
    if (!node && this.missingPaths.has(key)) {
      return false;
    }
    return observesLink(operation) ? node?.linkExists : node?.exists;
  }

  recordCacheHit(): void {
    this.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1;
  }

  getStatistics(): { hits: number; misses: number; paths: number } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      paths: this.entries.size + this.missingPaths.size,
    };
  }

  flush(): void {
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
      let mergedEntries: Map<string, CacheNode>;
      let mergedMissingPaths: Set<string>;
      try {
        this.load();
        mergedEntries = this.entries;
        mergedMissingPaths = this.missingPaths;
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

      const entries: ArchiveEntry[] = [
        ...[...mergedMissingPaths].map(entryPath => [entryPath, { exists: false }] as const),
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
        createdAt: this.createdAt,
        updatedAt: new Date().toISOString(),
        entries,
      };
      const serialized = serializeProtobufDocument(document);
      const gzipOptions = { mtime: 0 } as Parameters<typeof gzipSync>[1];
      const bytes = gzipSync(serialized, gzipOptions);
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
