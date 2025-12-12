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
import type { JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { analyzeSingleFile } from './analyzeFile.js';
import { error, info, warn } from '../../../../shared/src/helpers/logging.js';
import { tsConfigStore } from './file-stores/index.js';
import ts from 'typescript';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import type { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import { getBaseDir, isJsTsFile } from '../../../../shared/src/helpers/configuration.js';
import merge from 'lodash.merge';
import { IncrementalCompilerHost } from '../../program/compilerHost.js';
import {
  createProgramOptions,
  createProgramOptionsFromJson,
  defaultCompilerOptions,
  MISSING_EXTENDED_TSCONFIG,
  type ProgramOptions,
} from '../../program/tsconfig/options.js';
import { getProgramCacheManager } from '../../program/cache/programCache.js';
import { clearSourceFileContentCache } from '../../program/cache/sourceFileCache.js';
import { createStandardProgram } from '../../program/factory.js';
import { sanitizeProgramReferences } from '../../program/tsconfig/utils.js';

/**
 * Analyzes JavaScript / TypeScript files using TypeScript programs. Files not
 * included in any tsconfig from the cache will not be analyzed.
 *
 * @param files the list of JavaScript / TypeScript files to analyze.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param pendingFiles array of files which are still not analyzed, to keep track of progress
 *                     and avoid analyzing twice the same file
 * @param progressReport progress report to log analyzed files
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 */
export async function analyzeWithProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  const foundProgramOptions: ProgramOptions[] = [];
  const processedTSConfigs: Set<string> = new Set();
  const tsconfigs = tsConfigStore.getTsConfigs();

  // Process tsconfigs, discovering references as we go
  // Iterator calls next() on each iteration, so newly added references are automatically processed
  for (const tsConfig of tsconfigs) {
    if (isAnalysisCancelled()) {
      return;
    }
    if (!pendingFiles.size) {
      break;
    }

    // Skip if already processed
    if (processedTSConfigs.has(tsConfig)) {
      continue;
    }

    await analyzeFilesFromTsConfig(
      files,
      tsConfig,
      results,
      pendingFiles,
      foundProgramOptions,
      processedTSConfigs,
      progressReport,
      incrementalResultsChannel,
    );
  }

  await analyzeFilesFromEntryPoint(
    files,
    results,
    pendingFiles,
    foundProgramOptions,
    progressReport,
    incrementalResultsChannel,
  );

  if (foundProgramOptions.some(options => options.missingTsConfig)) {
    results.meta.warnings.push(MISSING_EXTENDED_TSCONFIG);
  }
  // Clear caches after SonarQube analysis (single-run, don't persist)
  const cacheManager = getProgramCacheManager();
  const stats = cacheManager.getCacheStats();
  if (stats.size > 0) {
    info(
      `SonarQube analysis complete. Clearing caches (${stats.size} program entries, ${stats.totalFilesAcrossPrograms} total files)`,
    );
    cacheManager.clear();
    clearSourceFileContentCache();
  }
}

async function analyzeFilesFromEntryPoint(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  foundProgramOptions: ProgramOptions[],
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  const rootNames = Array.from(pendingFiles).filter(file => isJsTsFile(file));
  if (rootNames.length === 0) {
    return;
  }

  info(
    `Analyzing ${rootNames.length} file(s) using ${foundProgramOptions.length ? 'merged compiler options' : 'default options'}`,
  );

  const programOptions = foundProgramOptions.length
    ? merge({}, ...foundProgramOptions)
    : createProgramOptionsFromJson(defaultCompilerOptions, rootNames, getBaseDir());
  programOptions.rootNames = rootNames;
  programOptions.host = new IncrementalCompilerHost(programOptions.options, getBaseDir());

  const tsProgram = createStandardProgram(programOptions);

  for (const fileName of rootNames) {
    if (isAnalysisCancelled()) {
      return;
    }

    await analyzeSingleFile(
      fileName,
      files[fileName],
      tsProgram,
      results,
      pendingFiles,
      progressReport,
      incrementalResultsChannel,
    );
  }
}

async function analyzeFilesFromTsConfig(
  files: JsTsFiles,
  tsconfig: string,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  foundProgramOptions: ProgramOptions[],
  processedTSConfigs: Set<string>,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  processedTSConfigs.add(tsconfig);
  info(`Creating TypeScript(${ts.version}) program with configuration file ${tsconfig}`);

  // Parse tsconfig to get compiler options
  let programOptions;
  try {
    programOptions = createProgramOptions(tsconfig);
  } catch (e) {
    error(`Failed to parse tsconfig ${tsconfig}: ${e}`);
    results.meta.warnings.push(
      `Failed to parse TSConfig file ${tsconfig}. Highest TypeScript supported version is ${ts.version}`,
    );
    return;
  }

  foundProgramOptions.push(programOptions);

  if (programOptions.missingTsConfig) {
    const msg = `${tsconfig} extends a configuration that was not found. Please run 'npm install' for a more complete analysis.`;
    warn(msg);
  }

  programOptions.host = new IncrementalCompilerHost(programOptions.options, getBaseDir());
  const tsProgram = createStandardProgram(programOptions);

  const filesToAnalyze = tsProgram
    .getSourceFiles()
    .map(sf => sf.fileName)
    .filter(fileName => files[fileName] && pendingFiles.has(fileName));

  for (const reference of sanitizeProgramReferences(tsProgram)) {
    if (!processedTSConfigs.has(reference)) {
      tsConfigStore.addDiscoveredTsConfig(reference);
    }
  }

  if (filesToAnalyze.length === 0) {
    info(`No files to analyze from tsconfig ${tsconfig}`);
    return;
  }

  info(
    `Analyzing ${filesToAnalyze.length} file(s) from tsconfig ${tsconfig} (${tsProgram.getSourceFiles().length} total files in program)`,
  );

  // Analyze each file using the same program
  for (const fileName of filesToAnalyze) {
    if (isAnalysisCancelled()) {
      return;
    }

    await analyzeSingleFile(
      fileName,
      files[fileName],
      tsProgram,
      results,
      pendingFiles,
      progressReport,
      incrementalResultsChannel,
    );
  }
}
