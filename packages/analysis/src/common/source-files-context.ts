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
import { FileSystemMap, FileSystemSet } from './filesystem.js';
import { dirnamePath, type NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { fileContentStore } from './file-content-store.js';

type ContentFile = { fileContent?: string };

/** The authoritative request entries and their case-aware lookup index. */
export class SourceFilesContext<T extends ContentFile = ContentFile> {
  files: Record<string, T> | null = null;
  private readonly byPath = new FileSystemMap<string, T>();
  private readonly directories = new FileSystemSet<string>();

  setFiles(files: Record<string, T>): void {
    this.clear();
    this.files = files;
    for (const [path, file] of Object.entries(files)) {
      this.addFile(path, file);
    }
  }

  addFile(path: string, file: T): void {
    this.byPath.set(path, file);
    fileContentStore.register(path, file);
    for (
      let directory = dirnamePath(path as NormalizedAbsolutePath);
      !this.directories.has(directory);
      directory = dirnamePath(directory)
    ) {
      this.directories.add(directory);
    }
  }

  getFile(path: string): T | undefined {
    return this.byPath.get(path);
  }

  hasDirectory(path: string): boolean {
    return this.directories.has(path);
  }

  clear(): void {
    this.files = null;
    this.byPath.clear();
    this.directories.clear();
  }
}
