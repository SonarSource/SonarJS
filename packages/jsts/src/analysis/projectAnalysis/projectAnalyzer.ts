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

import { File, FileFinder, toUnixPath } from '@sonar/shared';
import {
  DEFAULT_ENVIRONMENTS,
  DEFAULT_GLOBALS,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
} from './projectAnalysis';
import { PackageJson } from 'type-fest';
import { analyzeWithProgram } from './analyzeWithProgram';
import { analyzeWithWatchProgram } from './analyzeWithWatchProgram';
import { analyzeWithoutProgram } from './analyzeWithoutProgram';
import { initializeLinter } from '../../linter';
import { TSCONFIG_JSON, setTSConfigJsons, loopTSConfigs } from '../../program';
import { PACKAGE_JSON, parsePackageJson, setPackageJsons } from '../../dependencies';

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
  const watchProgram = input.isSonarlint || hasVueFile(inputFilenames);
  initializeLinter(rules, environments, globals);
  searchTSConfigJsonAndPackageJsonFiles(baseDir, exclusions);
  const tsConfigs = loopTSConfigs(
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

function hasVueFile(files: string[]) {
  return files.some(file => file.toLowerCase().endsWith('.vue'));
}

function searchTSConfigJsonAndPackageJsonFiles(baseDir: string, exclusions: string[]) {
  const result = FileFinder.searchFiles(
    baseDir,
    true,
    [{ pattern: PACKAGE_JSON, parser: parsePackageJson }, TSCONFIG_JSON],
    exclusions,
  );
  if (result?.[PACKAGE_JSON]) {
    setPackageJsons(result?.[PACKAGE_JSON] as Map<string, File<PackageJson>[]>);
  }
  if (result?.[TSCONFIG_JSON]) {
    setTSConfigJsons(result?.[TSCONFIG_JSON] as Map<string, File<void>[]>);
  }
}
