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

export interface File<T> {
  filename: string;
  contents: T;
}

type PatternsAndParser = {
  pattern: string;
  parser: (filename: string, contents: string | null) => unknown;
};
type MinimatchAndParser = {
  id: string;
  patterns: Minimatch[];
  parser?: (filename: string, contents: string | null) => unknown;
};

/**
 * filterId -> dirname -> files
 */
type FilesByFilter = {
  [filter: string]: Map<string, File<unknown>[]>;
};

export abstract class FileFinder {
  /**
   * Look for files in a given path recursively.
   * node_modules/ are ignored
   *
   * @param dir directory where the search starts
   * @param readContents read contents of the matched files and pass them to the parser
   * @param inclusionFilters glob patterns to search for, and parser function
   * @param exclusions glob patterns to ignore while walking the tree
   */
  static searchFiles(
    dir: string,
    readContents: boolean,
    inclusionFilters: (PatternsAndParser | string)[],
    exclusions: string[],
  ) {
    return walkDirectory(
      path.posix.normalize(toUnixPath(dir)),
      normalizeInput(inclusionFilters),
      stringToGlob(exclusions.concat(IGNORED_PATTERNS)),
      readContents,
    );
  }
}

function walkDirectory(
  baseDir: string,
  inclusionFilters: MinimatchAndParser[],
  exclusionPatterns: Minimatch[],
  readContents: boolean,
) {
  const dbs: FilesByFilter = {};
  for (const inclusionFilter of inclusionFilters) {
    dbs[inclusionFilter.id] = new Map();
  }
  const dirs = [baseDir];
  while (dirs.length) {
    const dir = dirs.shift()!;
    inclusionFilters.forEach(inclusionFilter => {
      dbs[inclusionFilter.id].set(dir, []);
    });
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filename = path.posix.join(dir, file.name);
      if (exclusionPatterns.some(pattern => pattern.match(filename))) {
        continue;
      }
      if (file.isDirectory()) {
        dirs.push(filename);
      } else {
        inclusionFilters.forEach(pattern => {
          filterAndParse(filename, pattern, dbs[pattern.id].get(dir)!, readContents);
        });
      }
    }
  }
  return dbs;
}

function filterAndParse(
  filename: string,
  { patterns, parser }: MinimatchAndParser,
  db: File<unknown>[],
  readContents: boolean,
): void {
  if (patterns.some(pattern => pattern.match(filename))) {
    debug(`Found file: ${filename}`);
    if (!parser) {
      db.push({ filename, contents: undefined });
      return;
    }
    try {
      const contents = readContents ? readFileSync(filename) : null;
      db.push({ filename, contents: parser(filename, contents) });
    } catch (e) {
      debug(`Error parsing file ${filename}: ${e}`);
    }
  }
}

function stringToGlob(patterns: string[]): Minimatch[] {
  return patterns.map(pattern => new Minimatch(pattern, { nocase: true, matchBase: true }));
}

function normalizeInput(patterns: (PatternsAndParser | string)[]): MinimatchAndParser[] {
  const normalized: MinimatchAndParser[] = [];
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      normalized.push({
        id: pattern,
        patterns: stringToGlob(pattern.split(',')),
      });
    } else {
      normalized.push({
        id: pattern.pattern,
        patterns: stringToGlob(pattern.pattern.split(',')),
        parser: pattern.parser,
      });
    }
  }
  return normalized;
}
