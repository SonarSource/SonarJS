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
import { toUnixPath, writeTmpFile } from './files';
import { debug } from './debug';

const TSCONFIG_JSON = 'tsconfig.json';
export interface TSConfig {
  filename: string;
  contents: string;
  isFallbackTSConfig?: boolean;
}

export class ProjectTSConfigs {
  public db: Map<string, TSConfig>;
  constructor(dir?: string) {
    this.db = new Map<string, TSConfig>();
    if (dir) {
      this.tsConfigLookup(dir);
    }
  }
  get(tsconfig: string) {
    return this.db.get(tsconfig);
  }

  /**
   * Iterate over saved tsConfig returning a fake tsconfig
   * as a fallback for the given file
   *
   * @param file the JS/TS file for which the tsconfig needs to be found
   * @param tsconfigs list of tsConfigs passed in the request input, they have higher priority
   */
  *iterateTSConfigs(file: string, tsconfigs?: string[]): Generator<TSConfig, void, undefined> {
    const normalizedInputTSConfigs = (tsconfigs ?? []).map(filename => toUnixPath(filename));
    yield* normalizedInputTSConfigs
      .map(tsConfigPath => {
        try {
          if (!this.db.has(tsConfigPath)) {
            const contents = fs.readFileSync(tsConfigPath, 'utf-8');
            this.db.set(tsConfigPath, {
              filename: tsConfigPath,
              contents,
            });
          }
          return this.db.get(tsConfigPath)!;
        } catch (e) {
          console.log(`ERROR Could not read ${file}`);
        }
      })
      .filter(isDefined);
    yield* [...this.db.values()]
      .filter(tsconfig => {
        return !normalizedInputTSConfigs.includes(tsconfig.filename);
      })
      .sort((tsconfig1, tsconfig2) => {
        const tsconfig = bestTSConfigForFile(file, tsconfig1, tsconfig2);
        if (tsconfig === undefined) {
          return 0;
        }
        return tsconfig === tsconfig1 ? -1 : 1;
      });
    yield {
      filename: `tsconfig-${file}.json`,
      contents: generateTSConfig([file]),
      isFallbackTSConfig: true,
    };
  }

  /**
   * Look for tsconfig files in a given path and its child paths.
   * node_modules is ignored
   *
   * @param dir parent folder where the search starts
   */
  tsConfigLookup(dir: string) {
    let changes = false;
    if (!dir || !fs.existsSync(dir)) {
      console.log(`ERROR Could not access project directory ${dir}`);
      throw Error(`Could not access project directory ${dir}`);
    }
    debug(`Looking for tsconfig files in ${dir}`);
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filename = toUnixPath(path.join(dir, file.name));
      if (file.name !== 'node_modules' && file.isDirectory()) {
        if (this.tsConfigLookup(filename)) {
          changes = true;
        }
      } else if (fileIsTSConfig(file.name) && !file.isDirectory()) {
        debug(`tsconfig found: ${filename}`);
        const contents = fs.readFileSync(filename, 'utf-8');
        const existingTsConfig = this.db.get(filename);
        if (!existingTsConfig || existingTsConfig.contents !== contents) {
          changes = true;
        }
        this.db.set(filename, {
          filename,
          contents,
        });
      }
    }
    return changes;
  }
}

function fileIsTSConfig(filename: string): boolean {
  return !!filename.match(/[tj]sconfig.*\.json/i);
}

/**
 * Given a file and two TSConfig, chose the better choice. tsconfig.json name has preference.
 * Otherwise, logic is based on nearest path compared to source file.
 *
 * @param file source file for which we need a tsconfig
 * @param tsconfig1 first TSConfig instance we want to compare
 * @param tsconfig2 second TSConfig instance we want to compare
 */
function bestTSConfigForFile(file: string, tsconfig1: TSConfig, tsconfig2: TSConfig) {
  const filename1 = path.basename(tsconfig1.filename).toLowerCase();
  const filename2 = path.basename(tsconfig2.filename).toLowerCase();

  if (filename1 === TSCONFIG_JSON && filename2 !== TSCONFIG_JSON) {
    return tsconfig1;
  } else if (filename1 !== TSCONFIG_JSON && filename2 === TSCONFIG_JSON) {
    return tsconfig2;
  }

  const fileDirs = path.dirname(file).split('/');
  const tsconfig1Dirs = path.dirname(tsconfig1.filename).split('/');
  const tsconfig2Dirs = path.dirname(tsconfig2.filename).split('/');
  let relativeDepth1 = -fileDirs.length;
  let relativeDepth2 = -fileDirs.length;

  for (let i = 0; i < fileDirs.length; i++) {
    if (tsconfig1Dirs.length > i && fileDirs[i] === tsconfig1Dirs[i]) {
      relativeDepth1++;
    }
    if (tsconfig2Dirs.length > i && fileDirs[i] === tsconfig2Dirs[i]) {
      relativeDepth2++;
    }
  }
  if (relativeDepth1 === 0 && tsconfig1Dirs.length > fileDirs.length) {
    relativeDepth1 = tsconfig1Dirs.length - fileDirs.length;
  }
  if (relativeDepth2 === 0 && tsconfig2Dirs.length > fileDirs.length) {
    relativeDepth2 = tsconfig2Dirs.length - fileDirs.length;
  }

  if (relativeDepth1 === relativeDepth2) {
    if (tsconfig1Dirs.length > tsconfig2Dirs.length) {
      return tsconfig2;
    } else {
      return tsconfig1;
    }
  } else if (relativeDepth1 > relativeDepth2) {
    return relativeDepth1 <= 0 ? tsconfig1 : tsconfig2;
  } else {
    return relativeDepth2 <= 0 ? tsconfig2 : tsconfig1;
  }
}

function generateTSConfig(files?: string[], include?: string[]) {
  const tsConfig = {
    compilerOptions: {
      allowJs: true,
      noImplicitAny: true,
    },
  } as any;
  if (files?.length) {
    tsConfig.files = files;
  }
  if (include?.length) {
    tsConfig.include = include;
  }
  return JSON.stringify(tsConfig);
}

export const wildcardTSConfigByBaseDir: Map<string, string> = new Map<string, string>();

export function getWildcardTSConfig(baseDir = '') {
  const normalizedBaseDir = toUnixPath(baseDir);
  let tsConfig = wildcardTSConfigByBaseDir.get(normalizedBaseDir);
  if (!tsConfig) {
    tsConfig = writeTmpFile(generateTSConfig(undefined, [`${toUnixPath(normalizedBaseDir)}/**/*`]));
    wildcardTSConfigByBaseDir.set(normalizedBaseDir, tsConfig);
  }
  return tsConfig;
}

function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}
