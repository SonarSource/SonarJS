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
import { hash } from 'node:crypto';
import { FileSystemMap } from './filesystem.js';

type ContentFile = { fileContent?: string };
type Entry = {
  content?: string;
  contentHash?: string;
  data?: Map<symbol, unknown>;
};

function setContent(entry: Entry, content: string | undefined): void {
  if (entry.content !== content) {
    entry.contentHash = undefined;
    entry.content = content;
  }
}

/** Shared raw contents and derived caches. Entries never determine analysis-root membership. */
class FileContentStore {
  private readonly entries = new FileSystemMap<string, Entry>();
  private readonly bindings = new WeakMap<ContentFile, Entry>();

  private entry(path: string): Entry {
    let entry = this.entries.get(path);
    if (!entry) {
      entry = {};
      this.entries.set(path, entry);
    }
    return entry;
  }

  register(path: string, file: ContentFile): void {
    const entry = this.entry(path);
    if (this.bindings.get(file) === entry) {
      return;
    }
    const content = file.fileContent;
    if (content !== undefined) {
      setContent(entry, content);
    }
    // Specialized stores keep their original File objects and metadata, while all
    // their content reads and edits go through the same cell.
    Object.defineProperty(file, 'fileContent', {
      configurable: true,
      enumerable: true,
      get: () => entry.content,
      set: (content: string | undefined) => {
        setContent(entry, content);
      },
    });
    this.bindings.set(file, entry);
  }

  get(path: string): string | undefined {
    return this.entries.get(path)?.content;
  }

  /** Hash a raw revision once, regardless of how many compiler hosts observe it. */
  contentHash(path: string, content: string): string {
    const entry = this.entries.get(path);
    if (entry?.content === content) {
      return (entry.contentHash ??= hash('sha256', content));
    }
    return hash('sha256', content);
  }

  has(path: string): boolean {
    return this.get(path) !== undefined;
  }

  set(path: string, content: string): this {
    setContent(this.entry(path), content);
    return this;
  }

  get size(): number {
    return [...this.entries.values()].filter(entry => entry.content !== undefined).length;
  }

  getData<T>(path: string, key: symbol): T | undefined {
    return this.entries.get(path)?.data?.get(key) as T | undefined;
  }

  setData<T>(path: string, key: symbol, value: T): void {
    const entry = this.entry(path);
    (entry.data ??= new Map()).set(key, value);
  }

  deleteData(path: string, key: symbol): void {
    this.entries.get(path)?.data?.delete(key);
  }

  clearData(key: symbol): void {
    for (const entry of this.entries.values()) {
      entry.data?.delete(key);
    }
  }

  *pathsWithData(key: symbol): IterableIterator<string> {
    for (const [path, entry] of this.entries) {
      if (entry.data?.has(key)) {
        yield path;
      }
    }
  }

  delete(path: string): boolean {
    this.entries.get(path)?.data?.clear();
    return this.entries.delete(path);
  }

  clear(): void {
    // File objects can outlive the analysis; release their derived objects as well.
    for (const entry of this.entries.values()) {
      entry.data?.clear();
    }
    this.entries.clear();
  }
}

export const fileContentStore = new FileContentStore();
