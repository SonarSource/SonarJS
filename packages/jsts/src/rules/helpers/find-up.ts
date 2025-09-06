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
import * as Path from 'node:path/posix';
import { Minimatch } from 'minimatch';
import { isRoot, toUnixPath } from './files.js';
import fs from 'fs';
import { ComputedCache } from '../../../../shared/src/helpers/cache.js';

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

export const MinimatchCache = new ComputedCache(
  (
    matcher: Minimatch,
    _cache: ComputedCache<any, any, Filesystem>,
    filesystem: Filesystem = fs,
  ) => {
    return new ComputedCache((from: string) => {
      const files: File[] = [];
      try {
        for (const entry of filesystem.readdirSync(from)) {
          const fullEntryPath = Path.join(from, entry.toString());

          const basename = Path.basename(fullEntryPath);

          if (matcher.match(basename)) {
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
              files.push({
                path: fullEntryPath,
                content: filesystem.readFileSync(fullEntryPath),
              });
            }
          }
        }
      } catch {}
      return files;
    });
  },
);

/**
 * Create an instance of FindUp.
 */
export function createFindUpFirstMatch(
  pattern: string,
  to?: string,
  filesystem: Filesystem = fs,
): ComputedCache<string, File | undefined> {
  const matcher = new Minimatch(pattern);
  const topDir = to ? toUnixPath(to) : undefined;
  const readDir = MinimatchCache.get(matcher, filesystem);

  const _findUpSimple = (
    from: string,
    cache: ComputedCache<string, File | undefined>,
  ): File | undefined => {
    if (from === '.') {
      // handle path.dirname returning "." in windows
      return undefined;
    }
    const matchingFiles = readDir.get(from);

    if (matchingFiles.length > 0) {
      return matchingFiles[0];
    }
    if (!isRoot(from) && from !== topDir) {
      const parent = Path.dirname(from);

      return cache.get(parent);
    }

    return undefined;
  };

  return new ComputedCache((from: string, cache: ComputedCache<string, File | undefined>) => {
    return _findUpSimple(toUnixPath(from), cache);
  });
}

export function createFindUp(
  pattern: string,
  to?: string,
  filesystem: Filesystem = fs,
): ComputedCache<string, File[]> {
  const matcher = new Minimatch(pattern);
  const topDir = to ? toUnixPath(to) : undefined;
  const readDir = MinimatchCache.get(matcher, filesystem);

  const _findUpAll = (from: string, cache: ComputedCache<string, File[]>): File[] => {
    if (from === '.') {
      // handle path.dirname returning "." in windows
      return [];
    }

    if (!isRoot(from) && from !== topDir) {
      const parent = Path.dirname(from);

      return [...readDir.get(from), ...cache.get(parent)];
    }

    return [...readDir.get(from)];
  };

  return new ComputedCache((from: string, cache: ComputedCache<string, File[]>) => {
    return _findUpAll(toUnixPath(from), cache);
  });
}
