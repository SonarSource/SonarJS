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
import ts from 'typescript';
import { isFileSystemCaseSensitive } from '../../common/filesystem.js';

// TypeScript exposes matchFiles at runtime but omits it from its public declarations.
// Reuse its tsconfig glob semantics rather than duplicating them with another matcher.
const { matchFiles } = ts as typeof ts & {
  matchFiles(
    root: string,
    extensions: readonly string[] | undefined,
    excludes: readonly string[] | undefined,
    includes: readonly string[] | undefined,
    caseSensitive: boolean,
    currentDirectory: string,
    depth: number | undefined,
    entries: (directory: string) => { files: string[]; directories: string[] },
    realpath: (file: string) => string,
  ): string[];
};

/** ts.sys.readDirectory captures the consumer's native case mode; replay needs the producer's. */
export const readDirectory: typeof ts.sys.readDirectory = (
  root,
  extensions,
  excludes,
  includes,
  depth,
) =>
  matchFiles(
    root,
    extensions,
    excludes,
    includes,
    isFileSystemCaseSensitive(),
    process.cwd(),
    depth,
    directory => {
      const files: string[] = [];
      const directories: string[] = [];
      try {
        for (const entry of fs.readdirSync(directory || '.', { withFileTypes: true })) {
          let stat: fs.Stats | fs.Dirent | undefined = entry;
          if (entry.isSymbolicLink()) {
            try {
              stat = fs.statSync(path.join(directory, entry.name), { throwIfNoEntry: false });
            } catch {
              continue;
            }
          }
          if (stat?.isFile()) {
            files.push(entry.name);
          } else if (stat?.isDirectory()) {
            directories.push(entry.name);
          }
        }
      } catch {
        return { files: [], directories: [] };
      }
      return { files, directories };
    },
    file => {
      try {
        return fs.realpathSync(file);
      } catch {
        return file;
      }
    },
  );
