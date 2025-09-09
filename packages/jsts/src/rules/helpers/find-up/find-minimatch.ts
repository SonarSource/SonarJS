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
import { Minimatch } from 'minimatch';
import { join, basename } from 'node:path/posix';
import { type File } from '../files.js';
import fs from 'fs';
import { ComputedCache } from '../cache.js';

interface Stats {
  isFile(): boolean;
}

export interface Filesystem {
  readdirSync: (typeof fs)['readdirSync'];
  readFileSync: (typeof fs)['readFileSync'];
  statSync: (typeof fs)['statSync'];
}

export const MinimatchCache = new ComputedCache<
  Minimatch,
  ComputedCache<string, File[]>,
  Filesystem
>((matcher: Minimatch, filesystem = fs) => {
  return new ComputedCache((from: string) => {
    const files: File[] = [];
    try {
      for (const entry of filesystem.readdirSync(from)) {
        const fullEntryPath = join(from, entry.toString());
        if (matcher.match(basename(fullEntryPath))) {
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
});
