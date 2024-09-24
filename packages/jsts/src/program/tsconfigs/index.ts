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
import { createTSConfigFile, writeTSConfigFile } from '../program.ts';
import { DEFAULT_MAX_FILES_FOR_TYPE_CHECKING } from '../../analysis/index.ts';
import { File, searchFiles } from '../../rules/helpers/index.ts';

export const TSCONFIG_JSON = 'tsconfig.json';

// Would need to parse jsonc (different spec from json, using jsonc-parser from Microsoft)
//import { TsConfigJson } from 'type-fest';
let TSConfigJsonsByBaseDir: Record<string, File<void>[]>;

export function loadTSConfigs(baseDir: string, exclusions: string[]) {
  const { tsConfigs } = searchFiles(baseDir, { tsConfigs: { pattern: TSCONFIG_JSON } }, exclusions);
  TSConfigJsonsByBaseDir = tsConfigs as Record<string, File<void>[]>;
}

export function clearTSConfigs() {
  TSConfigJsonsByBaseDir = {};
}

export function getTSConfigsCount() {
  let count = 0;
  for (const tsConfigs of Object.values(TSConfigJsonsByBaseDir)) {
    count += tsConfigs.length;
  }
  return count;
}

export function setTSConfigs(db: Record<string, File<void>[]>) {
  TSConfigJsonsByBaseDir = db;
}

export async function* getTSConfigsIterator(
  files: string[],
  baseDir: string,
  sonarLint: boolean,
  maxFilesForTypeChecking?: number,
) {
  let emptyTsConfigs = true;
  if (TSConfigJsonsByBaseDir) {
    for (const tsconfigs of Object.values(TSConfigJsonsByBaseDir)) {
      for (const { filename: tsConfig } of tsconfigs) {
        emptyTsConfigs = false;
        yield tsConfig;
      }
    }
  }
  const maxFiles =
    typeof maxFilesForTypeChecking === 'undefined'
      ? DEFAULT_MAX_FILES_FOR_TYPE_CHECKING
      : maxFilesForTypeChecking;
  if (emptyTsConfigs && files.length < maxFiles) {
    const tsConfig = sonarLint
      ? createTSConfigFile(undefined, [baseDir + '/**/*'])
      : createTSConfigFile(files);
    const { filename } = await writeTSConfigFile(tsConfig);
    yield filename;
  }
}
