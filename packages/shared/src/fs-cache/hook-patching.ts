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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { getActiveArchive } from './hook-state.js';
import type {
  ArchiveFacade,
  BufferedRealpath,
  Callable,
  CustomPromisifyFactory,
  FileDescriptorMap,
  FileHandleTracker,
  FsError,
  FunctionWithNative,
  OperationOptions,
  ReadArguments,
} from './hook-types.js';

/** Exports that are values or types rather than filesystem operations. */
export const FS_NON_OPERATION_EXPORTS = new Set([
  'F_OK',
  'R_OK',
  'W_OK',
  'X_OK',
  'constants',
  'promises',
  'Dir',
  'Dirent',
  'FSWatcher',
  'FileReadStream',
  'FileWriteStream',
  'ReadStream',
  'StatWatcher',
  'Stats',
  'WriteStream',
  '_StatWatcher',
]);

/** fs/promises operations that synchronously return async iterables instead of promises. */
const FS_PROMISE_ASYNC_ITERABLE_OPERATIONS = new Set(['glob', 'watch']);

export function readonlyFlags(flags: fs.OpenMode | undefined): boolean {
  if (flags === undefined) {
    return true;
  }
  if (typeof flags === 'string') {
    return flags === 'r' || flags === 'rs' || flags === 'sr';
  }
  return (
    (flags &
      (fs.constants.O_WRONLY |
        fs.constants.O_RDWR |
        fs.constants.O_CREAT |
        fs.constants.O_APPEND |
        fs.constants.O_TRUNC)) ===
    0
  );
}

export function openOperation(flags: fs.OpenMode | undefined): string {
  if (flags === undefined || flags === 'r' || flags === fs.constants.O_RDONLY) {
    return 'open:r';
  }
  return `open:${String(flags)}`;
}

export function readArguments(buffer: NodeJS.ArrayBufferView, args: ReadArguments) {
  if (args[0] && typeof args[0] === 'object') {
    const offset = args[0].offset ?? 0;
    return {
      offset,
      length: args[0].length ?? buffer.byteLength - offset,
      position: args[0].position ?? null,
    };
  }
  const offset = args[0] ?? 0;
  return {
    offset,
    length: args[1] ?? buffer.byteLength - offset,
    position: args[2] ?? null,
  };
}

export function realpathAsPromise(
  original: BufferedRealpath,
  input: fs.PathLike,
  options: OperationOptions | 'buffer',
  operation: string,
) {
  return new Promise<Buffer>((resolve, reject) =>
    original(input, options, (error, value) => {
      if (error) {
        reject(error);
      } else if (value === undefined) {
        reject(new Error(`${operation} returned no path`));
      } else {
        resolve(value);
      }
    }),
  );
}

function selectFilesystemImplementation(
  cachedValue: FunctionWithNative,
  nativeValue: FunctionWithNative,
  nativeThis: unknown,
): FunctionWithNative {
  const selected: FunctionWithNative = function (this: unknown, ...args: unknown[]) {
    return getActiveArchive()
      ? Reflect.apply(cachedValue, this, args)
      : Reflect.apply(nativeValue, nativeThis, args);
  };
  if (typeof cachedValue.native === 'function' && typeof nativeValue.native === 'function') {
    selected.native = selectFilesystemImplementation(
      cachedValue.native,
      nativeValue.native,
      nativeValue,
    );
  }
  return selected;
}

function preserveFunctionMetadata(
  selected: FunctionWithNative,
  nativeValue: FunctionWithNative,
  customPromisifyFactory?: CustomPromisifyFactory,
): void {
  for (const symbol of Object.getOwnPropertySymbols(nativeValue)) {
    if (symbol === promisify.custom) {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(nativeValue, symbol);
    if (descriptor) {
      Object.defineProperty(selected, symbol, descriptor);
    }
  }

  const customPromisifyDescriptor = Object.getOwnPropertyDescriptor(nativeValue, promisify.custom);
  if (customPromisifyDescriptor && customPromisifyFactory) {
    Object.defineProperty(selected, promisify.custom, {
      ...customPromisifyDescriptor,
      value: customPromisifyFactory(selected),
    });
  }
}

export function patch(
  target: object,
  patchedProperties: Set<PropertyKey>,
  name: PropertyKey,
  value: Callable,
  customPromisifyFactory?: CustomPromisifyFactory,
): void {
  const savedDescriptor = Object.getOwnPropertyDescriptor(target, name);
  if (!savedDescriptor) {
    throw new Error(`Cannot patch missing filesystem property: ${String(name)}`);
  }
  patchedProperties.add(name);
  const nativeValue =
    typeof savedDescriptor.get === 'function'
      ? (target as Record<PropertyKey, unknown>)[name]
      : savedDescriptor.value;
  const selected = selectFilesystemImplementation(
    value as FunctionWithNative,
    nativeValue as FunctionWithNative,
    target,
  );
  preserveFunctionMetadata(selected, nativeValue as FunctionWithNative, customPromisifyFactory);
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: selected,
  });
}

export function unsupportedFilesystemOperation(moduleName: string, name: PropertyKey): FsError {
  const error = new Error(
    `Filesystem cache does not support ${moduleName}.${String(name)} from Node ${process.version}`,
  ) as FsError;
  error.name = 'UnsupportedFsOperationError';
  error.code = 'ERR_SONARJS_FS_CACHE_UNSUPPORTED_OPERATION';
  return error;
}

/** Operations with two independent filesystem targets rather than one leading path or handle. */
const PASSTHROUGH_TWO_PATH_OPERATIONS = new Set([
  'copyFile',
  'copyFileSync',
  'cp',
  'cpSync',
  'link',
  'linkSync',
  'rename',
  'renameSync',
]);
function isPathLike(value: unknown): value is fs.PathLike {
  return typeof value === 'string' || Buffer.isBuffer(value) || value instanceof URL;
}

export function pathLikeToString(value: fs.PathLike): string {
  if (typeof value === 'string') {
    return value;
  }
  return Buffer.isBuffer(value) ? value.toString() : fileURLToPath(value as URL);
}

export function isPassthroughDescriptor(
  fileDescriptors: FileDescriptorMap,
  descriptor: number,
): boolean {
  const tracked = fileDescriptors.get(descriptor);
  return tracked?.virtual === false && tracked.passthrough;
}

function isPassthroughInput(
  archive: ArchiveFacade,
  fileDescriptors: FileDescriptorMap,
  fileHandles: FileHandleTracker,
  input: unknown,
): boolean {
  if (typeof input === 'number') {
    return isPassthroughDescriptor(fileDescriptors, input);
  }
  if (isPathLike(input)) {
    return archive.isPassthrough(input);
  }
  return typeof input === 'object' && input !== null && fileHandles.isPassthrough(input);
}

function isPassthroughGlob(archive: ArchiveFacade, args: unknown[]): boolean {
  const patterns = Array.isArray(args[0]) ? args[0] : [args[0]];
  const options = typeof args[1] === 'object' && args[1] !== null ? args[1] : undefined;
  const cwd = (options as { cwd?: fs.PathLike } | undefined)?.cwd ?? process.cwd();
  if (!isPathLike(cwd)) {
    return false;
  }
  const cwdPath = pathLikeToString(cwd);
  return patterns.every(pattern => {
    if (typeof pattern !== 'string') {
      return false;
    }
    return archive.isPassthrough(path.resolve(cwdPath, pattern));
  });
}

function isPassthroughSymlink(archive: ArchiveFacade, args: unknown[]): boolean {
  const [target, destination] = args;
  if (!isPathLike(target) || !isPathLike(destination) || !archive.isPassthrough(destination)) {
    return false;
  }
  const targetPath = pathLikeToString(target);
  const destinationPath = pathLikeToString(destination);
  const resolvedTarget = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(path.dirname(path.resolve(destinationPath)), targetPath);
  return archive.isPassthrough(resolvedTarget);
}

export function isPassthroughFilesystemOperation(
  archive: ArchiveFacade,
  fileDescriptors: FileDescriptorMap,
  fileHandles: FileHandleTracker,
  name: string,
  args: unknown[],
): boolean {
  if (name === 'glob' || name === 'globSync') {
    return isPassthroughGlob(archive, args);
  }
  if (name === 'symlink' || name === 'symlinkSync') {
    return isPassthroughSymlink(archive, args);
  }
  if (PASSTHROUGH_TWO_PATH_OPERATIONS.has(name)) {
    return (
      isPathLike(args[0]) &&
      archive.isPassthrough(args[0]) &&
      isPathLike(args[1]) &&
      archive.isPassthrough(args[1])
    );
  }
  if ((name === 'createReadStream' || name === 'createWriteStream') && args[1]) {
    const descriptor = (args[1] as { fd?: number }).fd;
    if (typeof descriptor === 'number' && isPassthroughDescriptor(fileDescriptors, descriptor)) {
      return true;
    }
  }
  return isPassthroughInput(archive, fileDescriptors, fileHandles, args[0]);
}

export function guardUnhandledFilesystemOperations(
  target: object,
  patchedProperties: Set<PropertyKey>,
  nonOperations: Set<string>,
  moduleName: string,
  canPassthrough: (name: string, args: unknown[]) => boolean,
  reject = false,
) {
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(target))) {
    if (patchedProperties.has(name) || nonOperations.has(name)) {
      continue;
    }
    const value =
      typeof descriptor.get === 'function'
        ? (target as Record<string, unknown>)[name]
        : descriptor.value;
    if (typeof value !== 'function') {
      continue;
    }
    patch(target, patchedProperties, name, (...args: unknown[]) => {
      if (canPassthrough(name, args)) {
        return Reflect.apply(value, target, args);
      }
      const error = unsupportedFilesystemOperation(moduleName, name);
      if (reject && !FS_PROMISE_ASYNC_ITERABLE_OPERATIONS.has(name)) {
        return Promise.reject(error);
      }
      throw error;
    });
  }
}

export function decodeFileContent(value: Buffer | string): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, 'base64');
}

export const CACHED_FILE_HANDLE = Symbol('cached filesystem file handle');
export const FS_PROMISES_MODULE = 'fs/promises';
