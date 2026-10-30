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
import ts from 'typescript';
import { canonicalPath, getArchivedFileSystemCaseSensitivity } from './filesystem-case.js';

/** The archive owns project semantics; without one use TypeScript's native filesystem probe. */
export function isFileSystemCaseSensitive(): boolean {
  return getArchivedFileSystemCaseSensitivity() ?? ts.sys.useCaseSensitiveFileNames;
}

/** Canonical keys never replace the original paths sent to the filesystem or reported to users. */
export function canonicalFileName<T extends string>(
  fileName: T,
  caseSensitive = isFileSystemCaseSensitive(),
): T {
  return canonicalPath(fileName, caseSensitive);
}

export function pathsEqual(left: string | undefined, right: string | undefined): boolean {
  return (
    left === right ||
    (left !== undefined &&
      right !== undefined &&
      canonicalFileName(left) === canonicalFileName(right))
  );
}

export function pathIsUnder(file: string, root: string): boolean {
  const name = canonicalFileName(file);
  const directory = canonicalFileName(root);
  return (
    name === directory || name.startsWith(directory.endsWith('/') ? directory : `${directory}/`)
  );
}

/**
 * Path-keyed collections preserve spelling and keep their filesystem policy while populated.
 * This also preserves response mappings after the replay session ends; clear starts a new context.
 */
export class FileSystemMap<K extends string, V> extends Map<K, V> {
  readonly #names = new Map<K, K>();
  #caseSensitive: boolean | undefined;

  private key(key: K): K {
    return canonicalFileName(key, this.#caseSensitive ?? isFileSystemCaseSensitive());
  }

  constructor(entries?: Iterable<readonly [K, V]>) {
    super();
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  override set(key: K, value: V): this {
    this.#caseSensitive ??= isFileSystemCaseSensitive();
    const canonical = this.key(key);
    const original = this.#names.get(canonical) ?? key;
    this.#names.set(canonical, original);
    return super.set(original, value);
  }

  override get(key: K): V | undefined {
    const original = this.#names.get(this.key(key));
    return original === undefined ? undefined : super.get(original);
  }

  override has(key: K): boolean {
    return this.#names.has(this.key(key));
  }

  override delete(key: K): boolean {
    const canonical = this.key(key);
    const original = this.#names.get(canonical);
    this.#names.delete(canonical);
    return original !== undefined && super.delete(original);
  }

  override clear(): void {
    this.#names.clear();
    this.#caseSensitive = undefined;
    super.clear();
  }
}

export class FileSystemSet<K extends string> extends Set<K> {
  readonly #names = new Map<K, K>();
  #caseSensitive: boolean | undefined;

  private key(key: K): K {
    return canonicalFileName(key, this.#caseSensitive ?? isFileSystemCaseSensitive());
  }

  constructor(values?: Iterable<K>) {
    super();
    if (values) {
      for (const value of values) {
        this.add(value);
      }
    }
  }

  override add(value: K): this {
    this.#caseSensitive ??= isFileSystemCaseSensitive();
    const key = this.key(value);
    if (!this.#names.has(key)) {
      this.#names.set(key, value);
      super.add(value);
    }
    return this;
  }

  override has(value: K): boolean {
    return this.#names.has(this.key(value));
  }

  override delete(value: K): boolean {
    const key = this.key(value);
    const original = this.#names.get(key);
    this.#names.delete(key);
    return original !== undefined && super.delete(original);
  }

  override clear(): void {
    this.#names.clear();
    this.#caseSensitive = undefined;
    super.clear();
  }
}
