/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { createTSConfigFile, writeTSConfigFile } from '../program.js';
import { File, searchFiles } from '../../rules/helpers/index.js';
import { DEFAULT_MAX_FILES_FOR_TYPE_CHECKING } from '../../analysis/projectAnalysis/projectAnalysis.js';

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
