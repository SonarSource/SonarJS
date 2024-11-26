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
import {
  DEFAULT_ENVIRONMENTS,
  DEFAULT_GLOBALS,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
} from './projectAnalysis.js';
import { analyzeWithProgram } from './analyzeWithProgram.js';
import { analyzeWithWatchProgram } from './analyzeWithWatchProgram.js';
import { analyzeWithoutProgram } from './analyzeWithoutProgram.js';
import { initializeLinter } from '../../linter/linters.js';
import {
  getTSConfigsIterator,
  setTSConfigs,
  TSCONFIG_JSON,
} from '../../program/tsconfigs/index.js';
import { toUnixPath } from '../../../../shared/src/helpers/files.js';
import { searchFiles, File } from '../../rules/index.js';

/**
 * Analyzes a JavaScript / TypeScript project in a single run
 *
 * @param input the JavaScript / TypeScript project to analyze
 * @returns the JavaScript / TypeScript project analysis output
 */
export async function analyzeProject(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  const {
    rules,
    baseDir,
    environments = DEFAULT_ENVIRONMENTS,
    globals = DEFAULT_GLOBALS,
    exclusions = [],
    isSonarlint = false,
    maxFilesForTypeChecking,
  } = input;
  const inputFilenames = Object.keys(input.files);
  const results: ProjectAnalysisOutput = {
    files: {},
    meta: {
      withProgram: false,
      withWatchProgram: false,
      filesWithoutTypeChecking: [],
      programsCreated: [],
    },
  };
  if (!inputFilenames.length) {
    return results;
  }
  const pendingFiles: Set<string> = new Set(inputFilenames);
  const watchProgram = input.isSonarlint;
  await initializeLinter(rules, environments, globals, baseDir);
  loadTSConfigAndPackageJsonFiles(baseDir, exclusions);
  const tsConfigs = getTSConfigsIterator(
    inputFilenames,
    toUnixPath(baseDir),
    isSonarlint,
    maxFilesForTypeChecking,
  );
  if (watchProgram) {
    results.meta!.withWatchProgram = true;
    await analyzeWithWatchProgram(input.files, tsConfigs, results, pendingFiles);
  } else {
    results.meta!.withProgram = true;
    await analyzeWithProgram(input.files, tsConfigs, results, pendingFiles);
  }

  await analyzeWithoutProgram(pendingFiles, input.files, results);
  return results;
}

/**
 * Gather all the tsconfig.json and package.json files in the project
 * and save them in their respective caches.
 */
function loadTSConfigAndPackageJsonFiles(baseDir: string, exclusions: string[]) {
  const { tsConfigs } = searchFiles(
    baseDir,
    {
      tsConfigs: { pattern: TSCONFIG_JSON },
    },
    exclusions,
  );
  setTSConfigs(tsConfigs as Record<string, File<void>[]>);
}
