/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { getBaseDir } from '../../../../shared/src/helpers/configuration.js';
import { tsConfigStore } from './file-stores/index.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import {
  createOrGetCachedProgramForFile,
  setSourceFilesContext,
  createProgramOptions,
  createProgramOptionsFromParsedConfig,
  defaultCompilerOptions,
  ProgramOptions,
} from '../../program/index.js';
import { error, info } from '../../../../shared/src/helpers/logging.js';
import { analyzeSingleFile } from './analyzeFile.js';
import { dirname } from 'node:path/posix';
import { sanitizeReferences } from '../../program/tsconfig/utils.js';

/**
 * Analyzes JavaScript / TypeScript files using cached SemanticDiagnosticsBuilderPrograms.
 * Finds the closest tsconfig for the first file and uses it for all files in the request.
 * Programs are cached and reused across requests, with incremental updates when files change.
 *
 * @param files the list of JavaScript / TypeScript files to analyze.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param pendingFiles array of files which are still not analyzed, to keep track of progress
 *                     and avoid analyzing twice the same file
 * @param progressReport progress report to log analyzed files
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 */
export async function analyzeWithIncrementalProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  setSourceFilesContext(files);

  const tsconfigs = tsConfigStore.getTsConfigs();

  for (const filename of pendingFiles) {
    if (isAnalysisCancelled()) {
      return;
    }

    const { program: builderProgram } = createOrGetCachedProgramForFile(
      getBaseDir(),
      filename,
      () => programOptionsFromClosestTsconfig(filename, tsconfigs, results),
    );
    const tsProgram = builderProgram.getProgram();

    await analyzeSingleFile(
      filename,
      files[filename],
      tsProgram,
      results,
      pendingFiles,
      progressReport,
      incrementalResultsChannel,
    );

    if (!pendingFiles.size) {
      break;
    }
  }
}

/**
 * Find the closest tsconfig that contains the given file.
 * "Closest" means longest common path prefix (most specific).
 * Returns null if no tsconfig contains the file.
 */
function programOptionsFromClosestTsconfig(
  file: string,
  sortedTsconfigs: string[],
  results: ProjectAnalysisOutput,
): ProgramOptions {
  let missingTsConfig = false;
  let programOptions: ProgramOptions | undefined = undefined;
  // sortedTsconfigs is already sorted by path length descending (longest first)
  for (const tsconfig of sortedTsconfigs) {
    const tsconfigDir = dirname(tsconfig);

    // Check if file is under this tsconfig's directory
    if (file.startsWith(tsconfigDir + '/')) {
      // Parse tsconfig to check if it actually includes this file
      try {
        programOptions = createProgramOptions(tsconfig);
        for (const reference of sanitizeReferences(programOptions.projectReferences || [])) {
          tsConfigStore.addDiscoveredTsConfig(reference);
        }
        missingTsConfig ||= programOptions.missingTsConfig;
        if (programOptions.rootNames.includes(file)) {
          break;
        }
      } catch (e) {
        error(`Failed to parse tsconfig ${tsconfig}: ${e}`);
        results.meta.warnings.push(
          `Failed to parse TSConfig file ${tsconfig}. Analysis may be incomplete.`,
        );
      }
    }
  }

  if (!programOptions) {
    info('No tsconfig found for files, using default options');
    // Fallback: use default options if no tsconfig found
    programOptions = createProgramOptionsFromParsedConfig(
      { compilerOptions: defaultCompilerOptions },
      getBaseDir(),
    );
  }

  if (missingTsConfig) {
    const msg =
      "At least one tsconfig.json extends a configuration that was not found. Please run 'npm install' for a more complete analysis.";
    info(msg);
    results.meta.warnings.push(msg);
  }

  return programOptions;
}
