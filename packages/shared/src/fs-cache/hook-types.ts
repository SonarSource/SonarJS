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
import type fs from 'node:fs';
import type { FsCacheArchive, FsCacheErrorSnapshot, PortablePath } from './archive.js';

export type FsError = Error & {
  code?: string;
  errno?: number;
  syscall?: string;
  path?: string;
};
export type Callable = (...args: never[]) => unknown;
export type FunctionWithNative = Callable & { native?: FunctionWithNative };
export type CustomPromisifyFactory = (selected: FunctionWithNative) => Callable;
export type EncodingOption = BufferEncoding | 'buffer' | null;
export type OperationOptions = {
  encoding?: EncodingOption;
  withFileTypes?: boolean;
  recursive?: boolean;
  bigint?: boolean;
  throwIfNoEntry?: boolean;
};
export type OperationOptionsInput = OperationOptions | BufferEncoding | 'buffer' | null | undefined;
export type ReadOptions = OperationOptions & {
  buffer?: NodeJS.ArrayBufferView;
  offset?: number;
  length?: number;
  position?: number | bigint | null;
};
export type ReadArguments =
  [ReadOptions] | [offset?: number, length?: number, position?: number | bigint | null];
export type CachedPathResult = { path: PortablePath };
export type DirectoryValue = string | Buffer | fs.Dirent<string | Buffer>;
export type CachedDirectoryValue = string | Buffer | fs.Dirent<string | Buffer>;
export type StatValue = fs.Stats | fs.BigIntStats;
export type ErrorCallback = (error: NodeJS.ErrnoException | null) => void;
export type ValueCallback<T> = (error: NodeJS.ErrnoException | null, value?: T) => void;
export type BufferedRealpath = (
  input: fs.PathLike,
  options: OperationOptions | 'buffer',
  callback: ValueCallback<Buffer>,
) => void;
type TrackedDescriptor =
  | { key?: string; passthrough: boolean; position: number; virtual: false }
  | {
      content?: Buffer;
      input: string;
      key: string;
      position: number;
      readError?: FsCacheErrorSnapshot;
      virtual: true;
    };
export type FileDescriptorMap = Map<number, TrackedDescriptor>;
export type FileHandleLike = { fd: number };
export type CacheInput = fs.PathLike | number | FileHandleLike;
export type FileHandleTracker = {
  add(value: object, passthrough: boolean): void;
  clear(): void;
  has(value: object): boolean;
  isPassthrough(value: object): boolean;
};
export type ArchiveFacade = Pick<
  FsCacheArchive,
  | 'decodePortablePath'
  | 'encodePortablePath'
  | 'get'
  | 'getExists'
  | 'isPassthrough'
  | 'blocksNativeRead'
  | 'keyFor'
  | 'recordCacheHit'
  | 'recordCacheMiss'
  | 'set'
> & { readonly mode: FsCacheArchive['mode'] | undefined };
