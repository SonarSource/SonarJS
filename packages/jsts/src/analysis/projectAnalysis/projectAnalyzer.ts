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

import { File, searchFiles, toUnixPath } from '@sonar/shared';
import {
  DEFAULT_ENVIRONMENTS,
  DEFAULT_GLOBALS,
  JsTsFiles,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
} from './projectAnalysis';
import { PackageJson } from 'type-fest';
import { analyzeWithProgram } from './analyzeWithProgram';
import { analyzeWithWatchProgram } from './analyzeWithWatchProgram';
import { analyzeWithoutProgram } from './analyzeWithoutProgram';
import { initializeLinter } from '../../linter';
import { TSCONFIG_JSON, setTSConfigs, getTSConfigsIterator } from '../../program';
import { PACKAGE_JSON, parsePackageJson, setPackageJsons } from '../../dependencies';
import { JsTsAnalysisOutput } from '../analysis';

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
  const shouldUseWatchProgram = input.isSonarlint || hasVueFile(inputFilenames);
  initializeLinter(rules, environments, globals);
  loadTSConfigAndPackageJsonFiles(baseDir, exclusions);
  const tsConfigs = getTSConfigsIterator(
    inputFilenames,
    toUnixPath(baseDir),
    isSonarlint,
    maxFilesForTypeChecking,
  );
  if (shouldUseWatchProgram) {
    results.meta!.withWatchProgram = true;
    results.files = await analyzeWithWatchProgram(input.files, tsConfigs);
  } else {
    results.meta!.withProgram = true;
    ({ resultFiles: results.files, programsCreated: results.meta!.programsCreated } =
      await analyzeWithProgram(input.files, tsConfigs));
  }

  const pendingFiles = computePending(input.files, results.files);

  const { resultFiles, filesWithoutTypeChecking } = await analyzeWithoutProgram(
    pendingFiles,
    input.files,
  );
  results.meta!.filesWithoutTypeChecking = filesWithoutTypeChecking;
  Object.assign(results.files, resultFiles);
  return results;
}

function computePending(
  inputFiles: JsTsFiles,
  analyzedFiles: { [key: string]: JsTsAnalysisOutput },
) {
  const pendingFiles: Set<string> = new Set();
  for (const filename of Object.keys(inputFiles)) {
    if (!analyzedFiles[filename]) {
      pendingFiles.add(filename);
    }
  }
  return pendingFiles;
}

function hasVueFile(files: string[]) {
  return files.some(file => file.toLowerCase().endsWith('.vue'));
}

/**
 * Gather all the tsconfig.json and package.json files in the project
 * and save them in their respective caches.
 */
function loadTSConfigAndPackageJsonFiles(baseDir: string, exclusions: string[]) {
  const { packageJsons, tsConfigs } = searchFiles(
    baseDir,
    {
      packageJsons: { pattern: PACKAGE_JSON, parser: parsePackageJson },
      tsConfigs: { pattern: TSCONFIG_JSON },
    },
    exclusions,
  );
  setPackageJsons(packageJsons as Record<string, File<PackageJson>[]>);
  setTSConfigs(tsConfigs as Record<string, File<void>[]>);
}
