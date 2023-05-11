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
import { getContext } from './context';
import { readFileSync, toUnixPath } from './files';
export interface TSConfig {
  filename: string;
  contents: string;
  isFallbackTSConfig?: boolean;
}

export class ProjectTSConfigs {
  public db: Map<string, TSConfig>;
  constructor(private readonly dir = getContext()?.workDir, launchLookup = true) {
    this.db = new Map<string, TSConfig>();
    if (launchLookup) {
      this.tsConfigLookup();
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
   */
  *iterateTSConfigs(file: string): Generator<TSConfig, void, undefined> {
    yield* [...this.db.values()].sort((tsconfig1, tsconfig2) => {
      const tsconfig = bestTSConfigForFile(file, tsconfig1, tsconfig2);
      if (tsconfig === undefined) {
        return 0;
      }
      return tsconfig === tsconfig1 ? -1 : 1;
    });
    yield {
      filename: `tsconfig-${file}.json`,
      contents: JSON.stringify({
        compilerOptions: {
          allowJs: true,
          noImplicitAny: true,
        },
        files: [file],
      }),
      isFallbackTSConfig: true,
    };
  }

  /**
   * Look for tsconfig files in a given path and its child paths.
   * node_modules is ignored
   *
   * @param dir parent folder where the search starts
   */
  tsConfigLookup(dir = this.dir) {
    if (!fs.existsSync(dir)) {
      console.log(`ERROR Could not access working directory ${dir}`);
      return;
    }

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filename = toUnixPath(path.join(dir, file));
      const stats = fs.lstatSync(filename);
      if (file !== 'node_modules' && stats.isDirectory()) {
        this.tsConfigLookup(filename);
      } else if (fileIsTSConfig(filename) && !stats.isDirectory()) {
        const contents = fs.readFileSync(filename, 'utf-8');
        this.db.set(filename, {
          filename,
          contents,
        });
      }
    }
  }

  /**
   * Check for any changes in the list of known tsconfigs
   *
   * @param force the check will be bypassed if we are not on SonarLint, unless force is `true`
   */
  reloadTsConfigs(force = false) {
    // No need to rescan if we are not on sonarlint, unless we force it
    if (!getContext()?.sonarlint && !force) {
      return false;
    }
    let changes = false;
    // check for changes in known tsconfigs
    for (const tsconfig of this.db.values()) {
      try {
        const contents = readFileSync(tsconfig.filename);
        if (tsconfig.contents !== contents) {
          changes = true;
        }
        tsconfig.contents = contents;
      } catch (e) {
        this.db.delete(tsconfig.filename);
        console.log(`ERROR: tsconfig is no longer accessible ${tsconfig.filename}`);
      }
    }
    return changes;
  }

  /**
   * Check a list of tsconfig paths and add their contents
   * to the internal list of tsconfigs.
   *
   * @param tsconfigs list of new or changed TSConfigs
   * @param force force the update of tsconfigs if we are not on SonarLint
   * @return true if there are changes, thus cache may need to be invalidated
   */
  upsertTsConfigs(tsconfigs: string[], force = false) {
    // No need to rescan if we are not on sonarlint, unless we force it
    if (!getContext()?.sonarlint && !force) {
      return false;
    }
    let changes = false;
    for (const tsconfig of tsconfigs) {
      const normalizedTsConfig = toUnixPath(tsconfig);
      if (!this.db.has(normalizedTsConfig)) {
        try {
          const contents = readFileSync(normalizedTsConfig);
          this.db.set(normalizedTsConfig, {
            filename: normalizedTsConfig,
            contents,
          });
          changes = true;
        } catch (e) {
          console.log(`ERROR: Could not read tsconfig ${tsconfig}`);
        }
      }
    }
    return changes;
  }
}

function fileIsTSConfig(filename: string): boolean {
  return !!filename.match(/[tj]sconfig[^\/]\.json/i);
}

/**
 * Given a file and two TSConfig, chose the better choice mostly
 * based on its path compared with source file. On equal path conditions,
 * tsconfig.json name has preference
 *
 * @param file source file for which we need a tsconfig
 * @param tsconfig1 first TSConfig instance we want to compare
 * @param tsconfig2 second TSConfig instance we want to compare
 */
function bestTSConfigForFile(file: string, tsconfig1: TSConfig, tsconfig2: TSConfig) {
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
    } else if (tsconfig1Dirs.length < tsconfig2Dirs.length) {
      return tsconfig1;
    }
    if (path.basename(tsconfig1.filename).toLowerCase() === 'tsconfig.json') {
      return tsconfig1;
    } else if (path.basename(tsconfig2.filename).toLowerCase() === 'tsconfig.json') {
      return tsconfig2;
    }
  } else if (relativeDepth1 > relativeDepth2) {
    return relativeDepth1 <= 0 ? tsconfig1 : tsconfig2;
  } else {
    return relativeDepth2 <= 0 ? tsconfig2 : tsconfig1;
  }
}
