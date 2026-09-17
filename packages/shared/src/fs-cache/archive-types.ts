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

export const FS_CACHE_MAGIC = 'sonarjs-filesystem-cache';
export const FS_CACHE_FORMAT_VERSION = 5;

export const ARCHIVE_FILE_MODE = 0o600;
export const LOCK_RETRY_DELAY_MS = 10;
export const LOCK_RETRY_LIMIT = 1_000;
export const LOCK_STALE_AGE_MS = LOCK_RETRY_DELAY_MS * LOCK_RETRY_LIMIT;

export type FsCacheErrorSnapshot = {
  name: string;
  message: string;
  code?: string;
  errno?: number;
  syscall?: string;
};
export type FsCacheOutcome<T> = { ok: true; value: T } | { ok: false; error: FsCacheErrorSnapshot };
export type PortablePath = { kind: 'absolute' | 'relative'; path: string };
export type RealpathOperation = 'realpath' | 'realpath.native';
export type CachedName = { kind: 'buffer'; value: string } | { kind: 'string'; value: string };
export type CachedStat = {
  fields: Record<string, string | undefined>;
  types: Record<string, boolean>;
};
export type CachedDirectoryEntry =
  | { kind: 'name'; name: CachedName }
  | { kind: 'dirent'; name: CachedName; type: string; parentPath: PortablePath };

export type OutcomeMap<T> = Record<string, FsCacheOutcome<T>>;
export type CacheNode = {
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
export type MapField = keyof Pick<
  CacheNode,
  'access' | 'directories' | 'opens' | 'readlinks' | 'realpaths' | 'stats'
>;
export type OperationSlot = { field: 'content' } | { field: MapField; key: string };
export type ArchiveMode = 'record' | 'replay';
export type ArchiveOptions = { archivePath: string; rootDir: string };
export type ArchiveEntry = { path: string; node: CacheNode };
export type ArchiveDocument = {
  magic: string;
  formatVersion: number;
  createdAt: string;
  updatedAt: string;
  entries: ArchiveEntry[];
  missingPaths?: string[];
};

export type ComparisonRoot = { directory: string; prefix: string };

export const nativeFs = {
  closeSync: fs.closeSync.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  mkdirSync: fs.mkdirSync.bind(fs),
  openSync: fs.openSync.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
  realpathSync: fs.realpathSync.bind(fs),
  realpathSyncNative: fs.realpathSync.native.bind(fs.realpathSync),
  renameSync: fs.renameSync.bind(fs),
  statSync: fs.statSync.bind(fs),
  unlinkSync: fs.unlinkSync.bind(fs),
  writeSync: fs.writeSync.bind(fs),
};

export const MAP_FIELDS: readonly MapField[] = [
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
export const STAT_TYPES = Object.keys(FS_TYPE_METHODS);
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

export class FsCacheArchiveError extends Error {
  code: string;
  incompatible: boolean;

  constructor(message: string, options?: ErrorOptions & { incompatible?: boolean }) {
    super(message, options);
    this.name = 'FsCacheArchiveError';
    this.code = 'ERR_SONARJS_FS_CACHE_ARCHIVE';
    this.incompatible = options?.incompatible === true;
  }
}

export function required<T>(value: T | null | undefined, field: string): T {
  if (value === null || value === undefined) {
    throw new FsCacheArchiveError(`Filesystem cache archive is missing ${field}`);
  }
  return value;
}

export function writeFileWithNativePrimitives(
  filePath: fs.PathLike,
  bytes: Uint8Array,
  mode: number,
) {
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
