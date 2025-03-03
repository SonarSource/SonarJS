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
/**
 * Any temporary file created with the `tmp` library will be removed once the Node.js process terminates.
 */
import tmp from 'tmp';
import { TsConfigJson } from 'type-fest';
import fs from 'fs/promises';
import { DEFAULT_MAX_FILES_FOR_TYPE_CHECKING } from './projectAnalysis.js';

tmp.setGracefulCleanup();

export const TSCONFIG_JSON = 'tsconfig.json';
let tsConfigs: string[] = [];

export function clearTSConfigs() {
  tsConfigs = [];
}

export function getTSConfigsCount() {
  return tsConfigs.length;
}

export function getTSConfigs() {
  return tsConfigs;
}

export function setTSConfigs(newTsConfigs: string[]) {
  tsConfigs = newTsConfigs;
}

export function addTSConfig(tsConfig: string) {
  tsConfigs.push(tsConfig);
}
export async function* getTSConfigsIterator(
  files: string[],
  baseDir: string,
  sonarLint: boolean,
  maxFilesForTypeChecking?: number,
) {
  let emptyTsConfigs = true;
  if (tsConfigs.length) {
    for (const tsConfig of tsConfigs) {
      emptyTsConfigs = false;
      yield tsConfig;
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

/**
 * Create the TSConfig file and returns its path.
 *
 * The file is written in a temporary location in the file system
 * and is marked to be removed after Node.js process terminates.
 *
 * @param tsConfig TSConfig to write
 * @returns the resolved TSConfig file path
 */
export async function writeTSConfigFile(tsConfig: TsConfigJson): Promise<{ filename: string }> {
  const filename = await new Promise<string>((resolve, reject) => {
    tmp.file({ template: 'tsconfig-XXXXXX.json' }, function _tempFileCreated(err, path) {
      if (err) reject(err);
      else resolve(path);
    });
  });
  await fs.writeFile(filename, JSON.stringify(tsConfig), 'utf-8');
  return { filename };
}

/**
 * Create and return a TSConfig object.
 *
 * @param files array of files included in the TS program
 * @param include inclusion paths of the TS Program
 * @returns the TSConfig object
 */
export function createTSConfigFile(files?: string[], include?: string[]): TsConfigJson {
  return {
    compilerOptions: {
      allowJs: true,
      noImplicitAny: true,
    },
    include,
    files,
  } as TsConfigJson;
}
