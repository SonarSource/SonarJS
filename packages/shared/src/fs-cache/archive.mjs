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
export const FS_CACHE_FORMAT_VERSION = 1;

const nativeFs = {
  closeSync: fs.closeSync.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  mkdirSync: fs.mkdirSync.bind(fs),
  openSync: fs.openSync.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
  renameSync: fs.renameSync.bind(fs),
  unlinkSync: fs.unlinkSync.bind(fs),
  writeFileSync: fs.writeFileSync.bind(fs),
};

export class FsCacheArchiveError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'FsCacheArchiveError';
    this.code = 'ERR_SONARJS_FS_CACHE_ARCHIVE';
  }
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
      );
    }
    if (this.analyzerVersion && document.analyzerVersion !== this.analyzerVersion) {
      throw new FsCacheArchiveError(
        `Filesystem cache analyzer version ${document.analyzerVersion || '<unspecified>'} does not match ${this.analyzerVersion}`,
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
        !entry.operations ||
        typeof entry.operations !== 'object'
      ) {
        throw new FsCacheArchiveError('Filesystem cache archive contains an invalid entry');
      }
      this.entries.set(entry.path, { ...entry.operations });
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
    return this.entries.get(key)?.[operation];
  }

  set(key, operation, outcome) {
    let operations = this.entries.get(key);
    if (!operations) {
      operations = {};
      this.entries.set(key, operations);
    }
    operations[operation] = outcome;
    this.dirty = true;
  }

  flush() {
    if (this.mode !== 'record' || !this.dirty) {
      return;
    }

    const directory = path.dirname(this.archivePath);
    nativeFs.mkdirSync(directory, { recursive: true });
    const lockPath = `${this.archivePath}.lock`;
    let lockDescriptor;
    const lockWaiter = new Int32Array(new SharedArrayBuffer(4));
    try {
      for (let attempt = 0; attempt < 1_000; attempt++) {
        try {
          lockDescriptor = nativeFs.openSync(lockPath, 'wx', 0o600);
          break;
        } catch (error) {
          if (error?.code !== 'EEXIST') throw error;
          if (attempt === 999) {
            throw new FsCacheArchiveError(
              `Timed out waiting to write filesystem cache archive: ${this.archivePath}`,
              { cause: error },
            );
          }
          Atomics.wait(lockWaiter, 0, 0, 10);
        }
      }

      const ownEntries = this.entries;
      this.entries = new Map();
      this.load();
      for (const [entryPath, operations] of ownEntries) {
        this.entries.set(entryPath, { ...this.entries.get(entryPath), ...operations });
      }

      const entries = [...this.entries.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([entryPath, operations]) => ({
          path: entryPath,
          operations: Object.fromEntries(
            Object.entries(operations).sort(([left], [right]) => left.localeCompare(right)),
          ),
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
        nativeFs.writeFileSync(temporaryPath, bytes, { mode: 0o600 });
        nativeFs.renameSync(temporaryPath, this.archivePath);
        this.dirty = false;
      } finally {
        if (nativeFs.existsSync(temporaryPath)) {
          nativeFs.unlinkSync(temporaryPath);
        }
      }
    } finally {
      if (lockDescriptor !== undefined) {
        nativeFs.closeSync(lockDescriptor);
        if (nativeFs.existsSync(lockPath)) {
          nativeFs.unlinkSync(lockPath);
        }
      }
    }
  }
}
