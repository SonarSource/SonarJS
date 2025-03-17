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
import {
  JsTsFiles,
  type ProjectAnalysisInput,
  type ProjectAnalysisOutput,
} from './projectAnalysis.js';
import { analyzeWithProgram } from './analyzeWithProgram.js';
import { analyzeWithWatchProgram } from './analyzeWithWatchProgram.js';
import { analyzeWithoutProgram } from './analyzeWithoutProgram.js';
import { Linter } from '../../linter/linter.js';
import { FileType, toUnixPath } from '../../../../shared/src/helpers/files.js';
import { findFiles } from '../../../../shared/src/helpers/find-files.js';
import { join, dirname } from 'node:path/posix';
import { readFile, access } from 'node:fs/promises';
import {
  addTSConfig,
  clearTSConfigs,
  getTSConfigsCount,
  getTSConfigsIterator,
  setTSConfigs,
  TSCONFIG_JSON,
} from './tsconfigs.js';
import {
  isAnalyzableFile,
  isJsTsFile,
  setGlobalConfiguration,
  isSonarLint,
  getGlobals,
  getEnvironments,
  maxFilesForTypeChecking,
  getTestPaths,
  getExclusions,
  getMaxFileSize,
} from '../../../../shared/src/helpers/configuration.js';
import { accept } from './filter/filter.js';

/**
 * Analyzes a JavaScript / TypeScript project in a single run
 *
 * @param input the JavaScript / TypeScript project to analyze
 * @returns the JavaScript / TypeScript project analysis output
 */
export async function analyzeProject(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  const { rules, baseDir, configuration = {}, bundles = [] } = input;
  const normalizedBaseDir = toUnixPath(baseDir);
  const results: ProjectAnalysisOutput = {
    files: {},
    meta: {
      withProgram: false,
      withWatchProgram: false,
      filesWithoutTypeChecking: [],
      programsCreated: [],
    },
  };
  setGlobalConfiguration(configuration);
  await Linter.initialize({
    rules,
    environments: getEnvironments(),
    globals: getGlobals(),
    sonarlint: isSonarLint(),
    bundles,
    baseDir: normalizedBaseDir,
  });
  clearTSConfigs();
  await verifyProvidedTsConfigs(normalizedBaseDir, configuration.tsConfigPaths);
  if (!input.files) {
    input.files = await loadFiles(normalizedBaseDir);
  }
  const inputFilenames = Object.keys(input.files);
  const pendingFiles: Set<string> = new Set(inputFilenames);
  await loadFiles(normalizedBaseDir);
  if (!inputFilenames.length) {
    return results;
  }
  const tsConfigs = getTSConfigsIterator(
    // we create the fallback tsconfig without html files, they alter the results (probably for the better)
    inputFilenames.filter(filename => isJsTsFile(filename)),
    normalizedBaseDir,
    isSonarLint(),
    maxFilesForTypeChecking(),
  );
  if (isSonarLint()) {
    results.meta!.withWatchProgram = true;
    await analyzeWithWatchProgram(input.files, tsConfigs, results, pendingFiles);
  } else {
    results.meta!.withProgram = true;
    await analyzeWithProgram(input.files, tsConfigs, results, pendingFiles);
  }

  await analyzeWithoutProgram(pendingFiles, input.files, results);
  return results;
}

export async function loadFiles(baseDir: string) {
  const tests = getTestPaths();
  const testPaths = tests ? tests.map(test => join(baseDir, test)) : null;

  const files: JsTsFiles = {};
  const foundTsConfigs: string[] = [];
  await findFiles(
    baseDir,
    async file => {
      if (isAnalyzableFile(file.name)) {
        const filePath = toUnixPath(join(file.parentPath, file.name));
        const fileType = getFiletype(filePath, testPaths);
        if (isJsTsFile(file.name)) {
          const fileContent = await readFile(filePath, 'utf8');
          if (accept(filePath, fileContent, getMaxFileSize())) {
            files[filePath] = { fileType, filePath, fileContent };
          }
        } else {
          files[filePath] = { fileType, filePath };
        }
      }
      if (file.name === TSCONFIG_JSON) {
        foundTsConfigs.push(toUnixPath(join(file.parentPath, file.name)));
      }
    },
    getExclusions(),
  );
  if (!getTSConfigsCount() && foundTsConfigs.length > 0) {
    setTSConfigs(foundTsConfigs);
  }
  return files;
}

export async function verifyProvidedTsConfigs(baseDir: string, tsConfigPaths?: string[]) {
  if (tsConfigPaths?.length) {
    for (const tsConfigPath of tsConfigPaths) {
      const tsConfig = join(baseDir, tsConfigPath.trim());
      try {
        await access(tsConfig);
        addTSConfig(tsConfig);
      } catch {}
    }
  }
}

function getFiletype(filePath: string, testPaths: string[] | null): FileType {
  if (testPaths?.length) {
    const parent = dirname(filePath);
    if (testPaths?.some(testPath => parent.startsWith(testPath))) {
      return 'TEST';
    }
  }
  return 'MAIN';
}
