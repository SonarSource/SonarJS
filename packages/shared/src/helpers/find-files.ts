/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import fs from 'fs';
import path from 'path';
import { toUnixPath, debug, readFileSync } from '@sonar/shared';
import { Minimatch } from 'minimatch';

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['.scannerwork'];

type ParserFunction = (filename: string, contents: string | null) => unknown;
type RawFilter = {
  pattern: string;
  parser?: ParserFunction;
};
/**
 * filterId -> filter
 */
type RawFilterMap = Record<string, RawFilter>;
type CompiledFilter = {
  patterns: Minimatch[];
  parser?: ParserFunction;
};
/**
 * filterId -> filter
 */
type FilterMap = Record<string, CompiledFilter>;

export interface File<T> {
  filename: string;
  contents: T;
}
/**
 * filterId -> dirname -> files
 */
type FilesByFilter = {
  [filter: string]: Map<string, File<unknown>[]>;
};

/**
 * Traverse the directory tree recursively from `dir` and
 * gather files matching the `inclusionFilters`
 * that were not matching the `exclusionPatterns`.
 *
 * @param rawDir directory where the search starts
 * @param inclusionFilters glob patterns to search for, and parser function
 * @param exclusions glob patterns to ignore while walking the tree
 */
export function searchFiles(rawDir: string, inclusionFilters: RawFilterMap, exclusions: string[]) {
  const dir = path.posix.normalize(toUnixPath(rawDir));
  const compiledInclusionFilters = compilePatterns(inclusionFilters);
  const exclusionPatterns = stringToGlob(exclusions.concat(IGNORED_PATTERNS));

  const result: FilesByFilter = {};
  for (const filterId of Object.keys(inclusionFilters)) {
    result[filterId] = new Map();
  }

  const dirs = [dir];
  while (dirs.length) {
    const dir = dirs.shift()!;
    for (const filterId of Object.keys(compiledInclusionFilters)) {
      result[filterId].set(dir, []);
    }
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filename = path.posix.join(dir, file.name);
      if (exclusionPatterns.some(pattern => pattern.match(filename))) {
        continue;
      }
      if (file.isDirectory()) {
        dirs.push(filename);
      } else {
        for (const [filterId, filter] of Object.entries(compiledInclusionFilters)) {
          filterAndParse(filename, filter, result[filterId].get(dir)!);
        }
      }
    }
  }
  return result;
}

function filterAndParse(
  filename: string,
  { patterns, parser }: CompiledFilter,
  db: File<unknown>[],
): void {
  if (patterns.some(pattern => pattern.match(filename))) {
    debug(`Found file: ${filename}`);
    if (!parser) {
      db.push({ filename, contents: undefined });
      return;
    }
    try {
      const contents = readFileSync(filename);
      db.push({ filename, contents: parser(filename, contents) });
    } catch (e) {
      debug(`Error parsing file ${filename}: ${e}`);
    }
  }
}

function stringToGlob(patterns: string[]): Minimatch[] {
  return patterns.map(pattern => new Minimatch(pattern, { nocase: true, matchBase: true }));
}

function compilePatterns(filters: RawFilterMap): FilterMap {
  const compiledFilterMap: FilterMap = {};
  for (const [filterId, filter] of Object.entries(filters)) {
    compiledFilterMap[filterId] = {
      patterns: stringToGlob(filter.pattern.split(',')),
      parser: filter.parser,
    };
  }
  return compiledFilterMap;
}
