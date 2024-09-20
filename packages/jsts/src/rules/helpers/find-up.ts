/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as Path from 'node:path/posix';
import type { vol } from 'memfs';
import { Minimatch } from 'minimatch';

interface Stats {
  isFile(): boolean;
}

export interface Filesystem {
  existsSync(path: string): boolean;

  mkdirSync(
    path: string,
    options: {
      recursive: true;
    },
  ): void;

  readdirSync: (typeof vol)['readdirSync'];

  readFileSync(path: string): Buffer | string;

  statSync(path: string): Stats;

  writeFileSync(path: string, data: Buffer | string): void;
}

export interface File {
  readonly path: string;
  readonly content: Buffer | string;
}

export type FindUp = (
  from: string,
  to: string,
  pattern: string,
  fallbackFilesystem: Filesystem,
) => Array<File>;

/**
 * Create an instance of FindUp.
 */
export const createFindUp = (): FindUp => {
  const registry: Map<string, Map<string, Array<File>>> = new Map();

  const findUp: FindUp = (from, to, pattern, filesystem) => {
    const results: Array<File> = [];

    let cache = registry.get(pattern);

    if (cache === undefined) {
      cache = new Map();

      registry.set(pattern, cache);
    }

    let cacheContent = cache.get(from);

    if (cacheContent === undefined) {
      cacheContent = [];

      cache.set(from, cacheContent);

      for (const entry of filesystem.readdirSync(from)) {
        const fullEntryPath = Path.join(from, entry.toString());

        let stats: Stats;

        // the resource may not be available
        try {
          stats = filesystem.statSync(fullEntryPath);
        } catch (error) {
          // todo: this is testable and should be tested
          stats = {
            isFile: () => false,
          };
        }

        if (stats.isFile()) {
          const basename = Path.basename(fullEntryPath);

          if (new Minimatch(pattern).match(basename)) {
            cacheContent.push({
              path: fullEntryPath,
              content: filesystem.readFileSync(fullEntryPath),
            });
          }
        }
      }
    }

    results.push(...cacheContent);

    if (from !== '/' && from !== to) {
      const parent = Path.dirname(from);

      results.push(...findUp(parent, to, pattern, filesystem));
    }

    return results;
  };

  return findUp;
};

/**
 * An instance of FindUp using a global cache.
 */
export const findUp = createFindUp();
