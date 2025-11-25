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
import { getBaseDir, isJsTsFile } from '../../../../shared/src/helpers/configuration.js';
import { tsConfigStore } from './file-stores/index.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import {
  createOrGetCachedProgramForFile,
  createProgramOptions,
  createProgramOptionsFromJson,
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
  const rootNames = Array.from(pendingFiles).filter(file => isJsTsFile(file));
  if (rootNames.length === 0) {
    return;
  }

  for (const filename of rootNames) {
    if (isAnalysisCancelled()) {
      return;
    }

    const program = createOrGetCachedProgramForFile(getBaseDir(), filename, () =>
      programOptionsFromClosestTsconfig(filename, results, pendingFiles),
    );

    await analyzeSingleFile(
      filename,
      files[filename],
      program,
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
 * "Closest" means the longest common path prefix (most specific).
 * Returns null if no tsconfig contains the file.
 */
function programOptionsFromClosestTsconfig(
  file: string,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
): ProgramOptions | undefined {
  let missingTsConfig = false;
  let programOptions: ProgramOptions | undefined = undefined;
  const processedTsConfigs = new Set<string>();

  let tsconfig: string | undefined;
  while (
    (tsconfig = pickBestMatchTsConfig(
      tsConfigStore.getTsConfigs().filter(tsconfig => !processedTsConfigs.has(tsconfig)),
      file,
    ))
  ) {
    processedTsConfigs.add(tsconfig);
    try {
      programOptions = createProgramOptions(tsconfig);
      if (programOptions.projectReferences?.length) {
        for (const reference of sanitizeReferences(programOptions.projectReferences)) {
          tsConfigStore.addDiscoveredTsConfig(reference);
        }
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

  if (!programOptions) {
    try {
      info('No tsconfig found for files, using default options');
      // Fallback: use default options if no tsconfig found
      programOptions = createProgramOptionsFromJson(
        defaultCompilerOptions,
        [...pendingFiles],
        getBaseDir(),
      );
    } catch (e) {
      error(`Failed to generate program from merged config: ${e}`);
    }
  }

  if (missingTsConfig) {
    const msg =
      "At least one tsconfig.json extends a configuration that was not found. Please run 'npm install' for a more complete analysis.";
    info(msg);
    results.meta.warnings.push(msg);
  }

  return programOptions;
}

function pickBestMatchTsConfig(tsconfigs: string[], file: string) {
  let bestTsConfig: string | undefined = undefined;
  for (const tsconfig of tsconfigs) {
    const tsconfigDir = dirname(tsconfig);
    if (
      file.startsWith(tsconfig) &&
      (bestTsConfig === undefined || dirname(bestTsConfig).length < tsconfigDir.length)
    ) {
      bestTsConfig = tsconfig;
    }
  }
  return bestTsConfig ?? tsconfigs.at(0);
}
