/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { isRoot, type File, type UnixPath } from '../files.js';
import { ComputedCache } from '../cache.js';
import { Filesystem, MinimatchCache } from './find-minimatch.js';
import fs from 'node:fs';
import { dirname } from 'node:path/posix';
import { Minimatch } from 'minimatch';

export const closestPatternCache = new ComputedCache(
  (pattern: string, filesystem: Filesystem = fs) => {
    const matcher = new Minimatch(pattern);
    const readDir = MinimatchCache.get(matcher, filesystem);
    return new ComputedCache((topDir: string) => {
      const newCache = new ComputedCache((from: UnixPath): File | undefined => {
        if (from === '.') {
          // handle path.dirname returning "." in windows
          return undefined;
        }
        const matchingFiles = readDir.get(from);

        if (matchingFiles.length > 0) {
          return matchingFiles[0];
        }
        if (!isRoot(from) && from !== topDir) {
          const parent = dirname(from) as UnixPath;

          return newCache.get(parent);
        }

        return undefined;
      });
      return newCache;
    });
  },
);
