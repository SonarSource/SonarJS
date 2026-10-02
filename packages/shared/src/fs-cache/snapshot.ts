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
import {
  type CachedDirectoryEntry,
  type CachedName,
  type CachedStat,
  DIRENT_TYPES,
  type FsCacheErrorSnapshot,
  FS_TYPE_METHODS,
  type PortablePath,
  type RealpathOperation,
} from './archive.js';

/**
 * Pure snapshot/restore helpers used by the filesystem cache hook to convert live Node.js
 * filesystem values (stats, dirents, paths, errors) into archive-safe representations and back.
 * None of these functions touch the active archive or any mutable hook state.
 */

export type FsError = Error & {
  code?: string;
  errno?: number;
  syscall?: string;
  path?: string;
};
export type CachedPathResult = { path: PortablePath };
export type DirectoryValue = string | Buffer | fs.Dirent<string | Buffer>;
export type CachedDirectoryValue = string | Buffer | fs.Dirent<string | Buffer>;
export type StatValue = fs.Stats | fs.BigIntStats;
export type ArchiveDecodePortablePath = {
  decodePortablePath(filePath: PortablePath, operation?: RealpathOperation): string;
};
export type ArchiveEncodePortablePath = {
  encodePortablePath(filePath: fs.PathLike): PortablePath;
};

export function pathDisplay(input: fs.PathLike | number): string {
  if (Buffer.isBuffer(input)) {
    return input.toString();
  }
  return String(input);
}

export function snapshotError(error: unknown): FsCacheErrorSnapshot {
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

export function restoreError(snapshot: FsCacheErrorSnapshot, input: fs.PathLike | number): FsError {
  const currentPath = pathDisplay(input);
  const error = new Error(snapshot.message.replaceAll('$PATH', currentPath)) as FsError;
  error.name = snapshot.name;
  error.code = snapshot.code;
  error.errno = snapshot.errno;
  error.syscall = snapshot.syscall;
  error.path = currentPath;
  return error;
}

export function snapshotStat(stat: StatValue): CachedStat {
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

export function restoreStat(snapshot: CachedStat, bigint = false): StatValue {
  const stat = Object.create(fs.Stats.prototype) as Record<string, unknown>;
  for (const [field, value] of Object.entries(snapshot.fields)) {
    if (value !== undefined) {
      stat[field] = restoreStatField(value, bigint);
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

function restoreStatField(value: string, bigint: boolean): number | bigint {
  if (!bigint) {
    return Number(value);
  }
  return /^-?\d+$/.test(value) ? BigInt(value) : BigInt(Math.trunc(Number(value)));
}

export function snapshotName(name: string | Buffer): CachedName {
  return Buffer.isBuffer(name)
    ? { kind: 'buffer', value: name.toString('base64') }
    : { kind: 'string', value: name };
}

export function restoreName(name: CachedName): string | Buffer {
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

export function snapshotDirectoryResult(
  result: DirectoryValue[],
  archive: ArchiveEncodePortablePath,
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
  archive: ArchiveDecodePortablePath,
) {
  const dirent = Object.create(fs.Dirent.prototype) as fs.Dirent<string | Buffer> &
    Record<string, unknown>;
  dirent.name = restoreName(snapshot.name);
  dirent.parentPath = archive.decodePortablePath(snapshot.parentPath);
  dirent.path = dirent.parentPath;
  for (const type of DIRENT_TYPES.slice(1)) {
    const method = FS_TYPE_METHODS[type as keyof typeof FS_TYPE_METHODS];
    if (method) {
      dirent[method] = () => snapshot.type === type;
    }
  }
  return dirent;
}

export function restoreDirectoryResult(
  result: CachedDirectoryEntry[],
  archive: ArchiveDecodePortablePath,
): CachedDirectoryValue[] {
  return result.map(entry =>
    entry.kind === 'name' ? restoreName(entry.name) : createDirent(entry, archive),
  );
}

export function snapshotPathResult(
  value: string | Buffer,
  archive: ArchiveEncodePortablePath,
): CachedPathResult {
  return {
    path: archive.encodePortablePath(value.toString()),
  };
}

export function restorePathResult(
  value: CachedPathResult,
  archive: ArchiveDecodePortablePath,
  operation: RealpathOperation,
): Buffer {
  return Buffer.from(archive.decodePortablePath(value.path, operation));
}
