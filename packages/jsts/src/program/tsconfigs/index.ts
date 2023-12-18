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

import { File, FileFinder } from '@sonar/shared';
import { createTSConfigFile, writeTSConfigFile } from '../program';

export const TSCONFIG_JSON = 'tsconfig.json';

// Would need to parse jsonc (different spec from json, using jsonc-parser from Microsoft)
//import { TsConfigJson } from 'type-fest';
export let TSConfigJsonsByBaseDir: Map<string, File<void>[]> | undefined = undefined;

export function searchTSConfigJsonFiles(baseDir: string, exclusions: string[]) {
  const result = FileFinder.searchFiles(baseDir, false, [TSCONFIG_JSON], exclusions);
  TSConfigJsonsByBaseDir = result?.[TSCONFIG_JSON] as Map<string, File<void>[]>;
}

export function getAllTSConfigJsons() {
  return TSConfigJsonsByBaseDir;
}

export function setTSConfigJsons(db: Map<string, File<void>[]>) {
  TSConfigJsonsByBaseDir = db;
}

export async function* loopTSConfigs(files: string[], baseDir: string, sonarLint: boolean) {
  let emptyTsConfigs = true;
  if (TSConfigJsonsByBaseDir) {
    for (const [, tsconfigs] of TSConfigJsonsByBaseDir) {
      for (const { filename: tsConfig } of tsconfigs) {
        emptyTsConfigs = false;
        yield tsConfig;
      }
    }
  }
  if (emptyTsConfigs) {
    const tsConfig = sonarLint
      ? createTSConfigFile(undefined, [baseDir + '/**/*'])
      : createTSConfigFile(files);
    const { filename } = await writeTSConfigFile(tsConfig);
    yield filename;
  }
}
