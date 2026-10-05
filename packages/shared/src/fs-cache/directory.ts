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
import type { CachedDirectoryEntry, FsCacheOutcome } from './archive.js';
import {
  type ArchiveDecodePortablePath,
  type ArchiveEncodePortablePath,
  type CachedDirectoryValue,
  type FsError,
  pathDisplay,
  restoreDirectoryResult,
  snapshotDirectoryResult,
  snapshotError,
} from './snapshot.js';

/**
 * Directory handle emulation and `fs.opendir`/`fs.opendirSync` patches used by the filesystem
 * cache hook. Extracted from hook.ts to keep that module focused on the simpler stat/read/open
 * patches.
 */

const originalFs = {
  opendirSync: fs.opendirSync.bind(fs),
};
const originalPromises = {
  opendir: fs.promises.opendir.bind(fs.promises),
};

type OperationOptions = {
  encoding?: BufferEncoding | 'buffer' | null;
  withFileTypes?: boolean;
  recursive?: boolean;
  bigint?: boolean;
  throwIfNoEntry?: boolean;
};
type ErrorCallback = (error: NodeJS.ErrnoException | null) => void;
type ValueCallback<T> = (error: NodeJS.ErrnoException | null, value?: T) => void;
export type ArchiveFacade = ArchiveDecodePortablePath &
  ArchiveEncodePortablePath & {
    readonly mode: 'record' | 'replay' | undefined;
    keyFor(input: fs.PathLike): string | undefined;
    get<T>(key: string, operation: string): FsCacheOutcome<T> | undefined;
    set<T>(key: string, operation: string, outcome: FsCacheOutcome<T>): void;
  };

export const MISSING = Symbol('missing directory cache observation');

export type DirectoryExecutor = {
  replay<TStored, TResult = TStored>(
    input: fs.PathLike,
    operation: string,
    decode?: (value: TStored) => TResult,
  ): TResult | typeof MISSING;
};

function success<T>(value: T): FsCacheOutcome<T> {
  return { ok: true, value };
}

function failure(error: unknown): FsCacheOutcome<never> {
  return { ok: false, error: snapshotError(error) };
}

function requireCallback<T>(callback: T | undefined, operation: string): T {
  if (!callback) {
    throw new TypeError(`${operation} requires a callback`);
  }
  return callback;
}

function getEncoding(
  options: OperationOptions | undefined,
): BufferEncoding | 'buffer' | null | undefined {
  return options?.encoding || undefined;
}

function opendirOperation(options: OperationOptions | undefined): string {
  return `opendir:${getEncoding(options) || 'utf8'}:${Boolean(options?.recursive)}`;
}

export class CachedDir {
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
      let entry;
      // The cursor on the underlying entries array is advanced one step per read, so each
      // iteration depends on the previous one having completed; the reads cannot be issued
      // concurrently via Promise.all.
      while ((entry = await this.read()) !== null) {
        yield entry;
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
    let entry: fs.Dirent | null;
    // Each directory read depends on the cursor state left by the previous read, so these
    // awaits cannot be parallelized with Promise.all.
    while ((entry = await directory.read()) !== null) {
      entries.push(entry);
    }
    return entries;
  } finally {
    await directory.close();
  }
}

export function createDirectoryPatches(archive: ArchiveFacade, executor: DirectoryExecutor) {
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
