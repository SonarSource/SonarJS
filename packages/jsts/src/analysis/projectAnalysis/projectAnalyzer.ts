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
import type { ProjectAnalysisInput, ProjectAnalysisOutput } from './projectAnalysis.js';
import { analyzeWithProgram } from './analyzeWithProgram.js';
import { analyzeWithWatchProgram } from './analyzeWithWatchProgram.js';
import { analyzeWithoutProgram } from './analyzeWithoutProgram.js';
import { Linter } from '../../linter/linter.js';
import { toUnixPath } from '../../../../shared/src/helpers/files.js';
import {
  setGlobalConfiguration,
  isSonarLint,
  getGlobals,
  getEnvironments,
} from '../../../../shared/src/helpers/configuration.js';
import { loadFiles } from './files-finder.js';
import { getFiles, getFilesCount } from './files.js';
import { info } from '../../../../shared/src/helpers/logging.js';

/**
 * Analyzes a JavaScript / TypeScript project in a single run
 *
 * @param input the JavaScript / TypeScript project to analyze
 * @returns the JavaScript / TypeScript project analysis output
 */
export async function analyzeProject(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  const { rules, baseDir, files, configuration = {}, bundles = [], rulesWorkdir } = input;
  const normalizedBaseDir = toUnixPath(baseDir);
  const results: ProjectAnalysisOutput = {
    files: {},
    meta: {
      withProgram: false,
      withWatchProgram: false,
      filesWithoutTypeChecking: [],
      programsCreated: [],
      warnings: [],
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
    rulesWorkdir,
  });
  await loadFiles(normalizedBaseDir, files);
  const filesToAnalyze = getFiles();
  info(`${getFilesCount()} source files to be analyzed`);
  if (getFilesCount()) {
    const filePathsToAnalyze = Object.keys(filesToAnalyze);
    const pendingFiles = new Set(filePathsToAnalyze);
    if (isSonarLint()) {
      results.meta.withWatchProgram = true;
      await analyzeWithWatchProgram(filesToAnalyze, results, pendingFiles);
    } else {
      results.meta.withProgram = true;
      await analyzeWithProgram(filesToAnalyze, results, pendingFiles);
    }
    if (pendingFiles.size) {
      info(
        `Found ${pendingFiles.size} file(s) not part of any tsconfig.json: they will be analyzed without type information`,
      );
      await analyzeWithoutProgram(pendingFiles, filesToAnalyze, results, baseDir);
    }
  }
  const analyzedFileCount = Object.keys(results.files).length;
  info(`${analyzedFileCount}/${analyzedFileCount} source files have been analyzed`);
  return results;
}
