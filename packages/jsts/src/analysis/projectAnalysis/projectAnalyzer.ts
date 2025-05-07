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
import { type ProjectAnalysisInput, type ProjectAnalysisOutput } from './projectAnalysis.js';
import { analyzeWithProgram } from './analyzeWithProgram.js';
import { analyzeWithWatchProgram } from './analyzeWithWatchProgram.js';
import { analyzeWithoutProgram } from './analyzeWithoutProgram.js';
import { Linter } from '../../linter/linter.js';
import { toUnixPath } from '../../../../shared/src/helpers/files.js';
import { getTSConfigsIterator, verifyProvidedTsConfigs } from './tsconfigs.js';
import {
  isJsTsFile,
  setGlobalConfiguration,
  isSonarLint,
  getGlobals,
  getEnvironments,
  maxFilesForTypeChecking,
} from '../../../../shared/src/helpers/configuration.js';
import { loadFiles } from './files-finder.js';
import { getFiles } from './files.js';

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
  await verifyProvidedTsConfigs(normalizedBaseDir, configuration.tsConfigPaths);
  const searchInputFiles = isSonarLint() || !input.files;
  await loadFiles(normalizedBaseDir, { jsts: searchInputFiles, tsconfigs: true });
  const filesToAnalyze = input.files ?? getFiles();
  if (filesToAnalyze.length) {
    const filePathsToAnalyze = Object.keys(filesToAnalyze);
    const pendingFiles: Set<string> = new Set(filePathsToAnalyze);
    const tsConfigs = getTSConfigsIterator(
      // we create the fallback tsconfig without HTML files, they alter the results (probably for the better)
      filePathsToAnalyze.filter(filename => isJsTsFile(filename)),
      normalizedBaseDir,
      isSonarLint(),
      maxFilesForTypeChecking(),
    );
    if (isSonarLint()) {
      results.meta!.withWatchProgram = true;
      await analyzeWithWatchProgram(filesToAnalyze, tsConfigs, results, pendingFiles);
    } else {
      results.meta!.withProgram = true;
      await analyzeWithProgram(filesToAnalyze, tsConfigs, results, pendingFiles);
    }
    await analyzeWithoutProgram(pendingFiles, filesToAnalyze, results);
  }
  return results;
}
