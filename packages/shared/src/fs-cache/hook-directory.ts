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
import type { CachedDirectoryEntry } from './archive.js';
import {
  type CacheExecutor,
  MISSING,
  failure,
  opendirOperation,
  pathDisplay,
  requireCallback,
  success,
} from './hook-core.js';
import { originalFs, originalPromises } from './hook-originals.js';
import { restoreDirectoryResult, snapshotDirectoryResult } from './hook-snapshots.js';
import type {
  ArchiveFacade,
  CachedDirectoryValue,
  ErrorCallback,
  FsError,
  OperationOptions,
  ValueCallback,
} from './hook-types.js';

class CachedDir {
  declare readonly path: string;
  entries: CachedDirectoryValue[];
  index: number;
  closed: boolean;

  constructor(dirPath: fs.PathLike, entries: CachedDirectoryValue[]) {
    Object.defineProperty(this, 'path', {
      configurable: true,
      enumerable: true,
      value: pathDisplay(dirPath),
    });
    this.entries = entries;
    this.index = 0;
    this.closed = false;
  }

  read(callback?: ValueCallback<CachedDirectoryValue | null>) {
    const operation = () => this.readSync();
    if (callback) {
      const entry = operation();
      queueMicrotask(() => callback(null, entry));
      return undefined;
    }
    return Promise.resolve().then(operation);
  }

  readSync(): CachedDirectoryValue | null {
    if (this.closed) {
      const error = new Error('Directory handle was closed') as FsError;
      error.code = 'ERR_DIR_CLOSED';
      throw error;
    }
    const entry = this.entries[this.index] || null;
    this.index += 1;
    return entry;
  }

  close(callback?: ErrorCallback) {
    const operation = () => this.closeSync();
    if (callback) {
      try {
        operation();
        queueMicrotask(() => callback(null));
      } catch (error) {
        queueMicrotask(() => callback(error as NodeJS.ErrnoException));
      }
      return undefined;
    }
    return Promise.resolve().then(operation);
  }

  closeSync(): void {
    if (this.closed) {
      const error = new Error('Directory handle was closed') as FsError;
      error.code = 'ERR_DIR_CLOSED';
      throw error;
    }
    this.closed = true;
  }

  async *[Symbol.asyncIterator]() {
    try {
      let entry = this.readSync();
      while (entry !== null) {
        yield entry;
        entry = this.readSync();
      }
    } finally {
      if (!this.closed) {
        this.closeSync();
      }
    }
  }

  async [Symbol.asyncDispose]() {
    if (!this.closed) {
      await this.close();
    }
  }

  [Symbol.dispose]() {
    if (!this.closed) {
      this.closeSync();
    }
  }
}
Object.setPrototypeOf(CachedDir.prototype, fs.Dir.prototype);

function readDirectoryWithOpendirSync(input: fs.PathLike, options?: OperationOptions): fs.Dirent[] {
  const directory = (
    originalFs.opendirSync as unknown as (input: fs.PathLike, options?: OperationOptions) => fs.Dir
  )(input, options);
  try {
    const entries: fs.Dirent[] = [];
    let entry: fs.Dirent | null;
    while ((entry = directory.readSync()) !== null) {
      entries.push(entry);
    }
    return entries;
  } finally {
    directory.closeSync();
  }
}

async function closeDirectoryIfOpen(directory: fs.Dir): Promise<void> {
  try {
    await directory.close();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_DIR_CLOSED') {
      throw error;
    }
  }
}

async function readDirectoryWithOpendir(
  input: fs.PathLike,
  options?: OperationOptions,
): Promise<fs.Dirent[]> {
  const directory = await (
    originalPromises.opendir as unknown as (
      input: fs.PathLike,
      options?: OperationOptions,
    ) => Promise<fs.Dir>
  )(input, options);
  try {
    const entries: fs.Dirent[] = [];
    for await (const entry of directory) {
      entries.push(entry);
    }
    return entries;
  } finally {
    await closeDirectoryIfOpen(directory);
  }
}

export function createDirectoryPatches(archive: ArchiveFacade, executor: CacheExecutor) {
  function opendirSync(input: fs.PathLike, options?: OperationOptions): fs.Dir | CachedDir {
    const operation = opendirOperation(options);
    const replayed = executor.replay<CachedDirectoryEntry[], CachedDirectoryValue[]>(
      input,
      operation,
      value => restoreDirectoryResult(value, archive),
    );
    if (replayed !== MISSING) {
      return new CachedDir(input, replayed as CachedDirectoryValue[]);
    }

    const key = archive.keyFor(input);
    try {
      const directory = (
        originalFs.opendirSync as unknown as (
          input: fs.PathLike,
          options?: OperationOptions,
        ) => fs.Dir
      )(input, options);
      if (archive.mode === 'record' && key !== undefined) {
        try {
          const entries = readDirectoryWithOpendirSync(input, options);
          archive.set(key, operation, success(snapshotDirectoryResult(entries, archive)));
        } catch {
          // Auxiliary capture must not alter a successful opendir call.
        }
      }
      return directory;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  async function opendirPromise(
    input: fs.PathLike,
    options?: OperationOptions,
  ): Promise<fs.Dir | CachedDir> {
    const operation = opendirOperation(options);
    const replayed = executor.replay<CachedDirectoryEntry[], CachedDirectoryValue[]>(
      input,
      operation,
      value => restoreDirectoryResult(value, archive),
    );
    if (replayed !== MISSING) {
      return new CachedDir(input, replayed as CachedDirectoryValue[]);
    }

    const key = archive.keyFor(input);
    try {
      const directory = await (
        originalPromises.opendir as unknown as (
          input: fs.PathLike,
          options?: OperationOptions,
        ) => Promise<fs.Dir>
      )(input, options);
      if (archive.mode === 'record' && key !== undefined) {
        try {
          const entries = await readDirectoryWithOpendir(input, options);
          archive.set(key, operation, success(snapshotDirectoryResult(entries, archive)));
        } catch {
          // Auxiliary capture must not alter a successful opendir call.
        }
      }
      return directory;
    } catch (error) {
      if (archive.mode === 'record' && key !== undefined) {
        archive.set(key, operation, failure(error));
      }
      throw error;
    }
  }

  function opendir(
    input: fs.PathLike,
    options: OperationOptions | ValueCallback<fs.Dir | CachedDir> | undefined,
    callback?: ValueCallback<fs.Dir | CachedDir>,
  ): void {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const done = requireCallback(callback, 'fs.opendir');
    opendirPromise(input, options).then(
      value => done(null, value),
      error => done(error),
    );
  }

  return { opendir, opendirPromise, opendirSync };
}
