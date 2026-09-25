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
import { normalizePath } from '../../../analysis/src/jsts/rules/helpers/path-normalization.js';
import {
  ARCHIVE_FILE_MODE,
  type ArchiveDocument,
  type ArchiveEntry,
  type ArchiveMode,
  type ArchiveOptions,
  type CacheNode,
  type ComparisonRoot,
  FS_CACHE_FORMAT_VERSION,
  FS_CACHE_MAGIC,
  FsCacheArchiveError,
  type FsCacheOutcome,
  LOCK_RETRY_DELAY_MS,
  LOCK_RETRY_LIMIT,
  LOCK_STALE_AGE_MS,
  nativeFs,
  type PortablePath,
  type RealpathOperation,
  writeFileWithNativePrimitives,
} from './archive-types.js';
import { deserializeProtobufDocument, serializeProtobufDocument } from './archive-serialization.js';
import {
  createNode,
  isMissingOutcome,
  mergeNodes,
  namesFromEntries,
  observesLink,
  operationSlot,
  readSlot,
  sortedNode,
  updateExistence,
  writeSlot,
} from './archive-nodes.js';

export type {
  ArchiveOptions,
  CachedDirectoryEntry,
  CachedName,
  CachedStat,
  FsCacheErrorSnapshot,
  FsCacheOutcome,
  PortablePath,
  RealpathOperation,
} from './archive-types.js';
export { DIRENT_TYPES, FS_CACHE_FORMAT_VERSION, FS_TYPE_METHODS } from './archive-types.js';

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

function resolvePhysicalRoots(rootDir: string) {
  const physicalRootDirs: Partial<Record<RealpathOperation, string>> = {};
  const rootAliases = [normalizeForComparison(rootDir)];
  const physicalRootReaders: [RealpathOperation, (path: fs.PathLike) => string][] = [
    ['realpath', nativeFs.realpathSync],
    ['realpath.native', nativeFs.realpathSyncNative],
  ];
  for (const [operation, readPhysicalRoot] of physicalRootReaders) {
    try {
      const physicalRootDir = readPhysicalRoot(rootDir);
      physicalRootDirs[operation] = physicalRootDir;
      const physicalRoot = normalizeForComparison(physicalRootDir);
      if (!rootAliases.includes(physicalRoot)) {
        rootAliases.push(physicalRoot);
      }
    } catch {
      // Resolving aliases is an optional portability optimization. Preserve native fs behavior
      // when the root cannot be resolved, without adding analyzer errors or warnings.
    }
  }
  return { physicalRootDirs, rootAliases };
}

function normalizeForComparison(filePath: string) {
  return path.sep === '\\' ? normalizePath(filePath) : filePath;
}

function comparisonRoot(directory: string): ComparisonRoot {
  return {
    directory,
    prefix: directory.endsWith('/') ? directory : `${directory}/`,
  };
}

function pathLikeToString(input: fs.PathLike): string | undefined {
  if (typeof input === 'string') {
    return input;
  }
  if (Buffer.isBuffer(input)) {
    return input.toString();
  }
  if (input instanceof URL && input.protocol === 'file:') {
    return fileURLToPath(input);
  }
  return undefined;
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
  physicalRootDirs: Partial<Record<RealpathOperation, string>>;
  comparisonRoots: ComparisonRoot[];
  passthroughRoots: ComparisonRoot[];
  mode: ArchiveMode;
  createdAt: string;
  entries: Map<string, CacheNode>;
  missingPaths: Set<string>;
  pathKeys: Map<string, string>;
  dirty: boolean;
  cacheHits: number;
  cacheMisses: number;

  constructor({ archivePath, passthroughDirs = [], rootDir }: ArchiveOptions) {
    if (!archivePath) {
      throw new FsCacheArchiveError('The filesystem cache archive path is required');
    }
    if (!rootDir) {
      throw new FsCacheArchiveError('The filesystem cache root directory is required');
    }
    this.archivePath = path.resolve(archivePath);
    this.rootDir = path.resolve(rootDir);
    this.mode = nativeFs.existsSync(this.archivePath) ? 'replay' : 'record';
    const { physicalRootDirs, rootAliases } =
      this.mode === 'record'
        ? resolvePhysicalRoots(this.rootDir)
        : { physicalRootDirs: {}, rootAliases: [normalizeForComparison(this.rootDir)] };
    this.physicalRootDirs = physicalRootDirs;
    this.comparisonRoots = rootAliases
      .map(comparisonRoot)
      .sort((left, right) => right.directory.length - left.directory.length);
    this.passthroughRoots = passthroughDirs
      .map(directory => comparisonRoot(normalizeForComparison(path.resolve(directory))))
      .sort((left, right) => right.directory.length - left.directory.length);
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
    const filePath = pathLikeToString(input);
    if (filePath === undefined) {
      return undefined;
    }

    const inputPath = filePath;
    const cachedKey = this.pathKeys.get(inputPath);
    if (cachedKey !== undefined) {
      return cachedKey;
    }

    const comparisonFilePath = normalizeForComparison(filePath);
    if (this.isPassthrough(input)) {
      return undefined;
    }
    let relativePath;
    const needsNormalization =
      comparisonFilePath.includes('/./') ||
      comparisonFilePath.endsWith('/.') ||
      comparisonFilePath.includes('/../') ||
      comparisonFilePath.endsWith('/..') ||
      comparisonFilePath.includes('//');
    if (path.isAbsolute(comparisonFilePath) && !needsNormalization) {
      const root = this.comparisonRoots.find(
        candidate =>
          comparisonFilePath === candidate.directory ||
          comparisonFilePath.startsWith(candidate.prefix),
      );
      if (!root) {
        return undefined;
      }
      relativePath =
        comparisonFilePath === root.directory ? '' : comparisonFilePath.slice(root.prefix.length);
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

  isPassthrough(input: fs.PathLike): boolean {
    const filePath = pathLikeToString(input);
    if (filePath === undefined) {
      return false;
    }
    const absoluteComparisonFilePath = normalizeForComparison(path.resolve(filePath));
    return this.passthroughRoots.some(
      candidate =>
        absoluteComparisonFilePath === candidate.directory ||
        absoluteComparisonFilePath.startsWith(candidate.prefix),
    );
  }

  absolutePathFor(key: string, rootDir = this.rootDir): string {
    return key === '.' ? rootDir : path.join(rootDir, ...key.split('/'));
  }

  encodePortablePath(filePath: fs.PathLike): PortablePath {
    const key = this.keyFor(filePath);
    return key === undefined
      ? { kind: 'absolute', path: String(filePath) }
      : { kind: 'relative', path: key };
  }

  decodePortablePath(portablePath: PortablePath, operation?: RealpathOperation): string {
    const rootDir = operation ? (this.physicalRootDirs[operation] ?? this.rootDir) : this.rootDir;
    return portablePath.kind === 'relative'
      ? this.absolutePathFor(portablePath.path, rootDir)
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
