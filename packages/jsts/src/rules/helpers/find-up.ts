
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { join, dirname, basename } from 'node:path/posix';
import { Minimatch } from 'minimatch';
import { isRoot, toUnixPath } from './files.js';
import fs from 'node:fs';

interface Stats {
  isFile(): boolean;
}

export interface Filesystem {
  readdirSync: (typeof fs)['readdirSync'];
  readFileSync: (typeof fs)['readFileSync'];
  statSync: (typeof fs)['statSync'];
}

interface File {
  readonly path: string;
  readonly content: Buffer | string;
}

type FindUp = (from: string, to?: string, filesystem?: Filesystem) => Array<File>;

/**
 * Create an instance of FindUp.
 */
export const createFindUp = (pattern: string): FindUp => {
  const cache: Map<string, Array<File>> = new Map();
  const matcher = new Minimatch(pattern);

  const findUp: FindUp = (from, to?, filesystem = fs) => {
    return _findUp(toUnixPath(from), to ? toUnixPath(to) : undefined, filesystem);
  };

  const _findUp: FindUp = (from, to?, filesystem = fs) => {
    const results: Array<File> = [];

    if (from === '.') {
      // handle path.dirname returning "." in windows
      return results;
    }

    let cacheContent = cache.get(from);

    if (cacheContent === undefined) {
      cacheContent = [];

      cache.set(from, cacheContent);

      try {
        for (const entry of filesystem.readdirSync(from)) {
          const fullEntryPath = join(from, entry.toString());

          const filename = basename(fullEntryPath);

          if (matcher.match(filename)) {
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
              cacheContent.push({
                path: fullEntryPath,
                content: filesystem.readFileSync(fullEntryPath),
              });
            }
          }
        }
      } catch {}
    }

    results.push(...cacheContent);

    if (!isRoot(from) && from !== to) {
      const parent = dirname(from);

      results.push(..._findUp(parent, to, filesystem));
    }

    return results;
  };

  return findUp;
};
