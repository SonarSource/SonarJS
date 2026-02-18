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
import type { JsTsConfigFields, JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { analyzeFile } from './analyzeFile.js';
import { error, info, warn } from '../../../../shared/src/helpers/logging.js';
import { tsConfigStore } from './file-stores/index.js';
import ts from 'typescript';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import type { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import { isJsTsFile } from '../../../../shared/src/helpers/configuration.js';
import merge from 'lodash.merge';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import type { RuleConfig as CssRuleConfig } from '../../../../css/src/linter/config.js';
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
 * @param baseDir the base directory for the project
 * @param canAccessFileSystem whether the analyzer can access the file system
 * @param jsTsConfigFields configuration fields for JS/TS analysis
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 * @param cssRules optional CSS rule configuration for stylelint analysis
 */
export async function analyzeWithProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<NormalizedAbsolutePath>,
  progressReport: ProgressReport,
  baseDir: NormalizedAbsolutePath,
  canAccessFileSystem: boolean,
  jsTsConfigFields: JsTsConfigFields,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
  cssRules?: CssRuleConfig[],
) {
  const foundProgramOptions: ProgramOptions[] = [];
  const processedTSConfigs: Set<NormalizedAbsolutePath> = new Set();
  const tsconfigs = tsConfigStore.getTsConfigs();

  // Process tsconfigs, discovering project references as we go.
  // When a tsconfig has project references, we add them via addDiscoveredTsConfig(),
  // and they will be included in this iteration since getTsConfigs() returns a live iterable.
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
      baseDir,
      canAccessFileSystem,
      jsTsConfigFields,
      incrementalResultsChannel,
      cssRules,
    );
  }

  if (jsTsConfigFields.createTSProgramForOrphanFiles) {
    await analyzeFilesFromEntryPoint(
      files,
      results,
      pendingFiles,
      foundProgramOptions,
      progressReport,
      baseDir,
      jsTsConfigFields,
      incrementalResultsChannel,
      cssRules,
    );
  } else if (pendingFiles.size) {
    info(
      `Skipping TypeScript program creation for ${pendingFiles.size} orphan file(s) (sonar.javascript.createTSProgramForOrphanFiles=false)`,
    );
  }

  if (foundProgramOptions.some(options => options.missingTsConfig)) {
    results.meta.warnings.push(MISSING_EXTENDED_TSCONFIG);
  }
  // Clear caches after SonarQube analysis to free memory (single-run, don't persist).
  // Note: analyzeWithIncrementalProgram (SonarLint) intentionally keeps caches for subsequent requests.
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
  pendingFiles: Set<NormalizedAbsolutePath>,
  foundProgramOptions: ProgramOptions[],
  progressReport: ProgressReport,
  baseDir: NormalizedAbsolutePath,
  jsTsConfigFields: JsTsConfigFields,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
  cssRules?: CssRuleConfig[],
) {
  const { jsSuffixes, tsSuffixes, cssSuffixes } = jsTsConfigFields.shouldIgnoreParams;
  const rootNames: NormalizedAbsolutePath[] = Array.from(pendingFiles).filter(file =>
    isJsTsFile(file, { jsSuffixes, tsSuffixes, cssSuffixes }),
  );
  if (rootNames.length === 0) {
    return;
  }

  info(
    `Analyzing ${rootNames.length} file(s) using ${foundProgramOptions.length ? 'merged compiler options' : 'default options'}`,
  );

  const programOptions = foundProgramOptions.length
    ? merge({}, ...foundProgramOptions)
    : createProgramOptionsFromJson(defaultCompilerOptions, rootNames, baseDir);
  programOptions.rootNames = rootNames;
  programOptions.host = new IncrementalCompilerHost(programOptions.options, baseDir);

  const tsProgram = createStandardProgram(programOptions);

  for (const fileName of rootNames) {
    if (isAnalysisCancelled()) {
      return;
    }

    await analyzeFile(
      fileName,
      files[fileName],
      jsTsConfigFields,
      tsProgram,
      results,
      pendingFiles,
      progressReport,
      incrementalResultsChannel,
      cssRules,
    );
  }
}

async function analyzeFilesFromTsConfig(
  files: JsTsFiles,
  tsconfig: NormalizedAbsolutePath,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<NormalizedAbsolutePath>,
  foundProgramOptions: ProgramOptions[],
  processedTSConfigs: Set<NormalizedAbsolutePath>,
  progressReport: ProgressReport,
  baseDir: NormalizedAbsolutePath,
  canAccessFileSystem: boolean,
  jsTsConfigFields: JsTsConfigFields,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
  cssRules?: CssRuleConfig[],
) {
  processedTSConfigs.add(tsconfig);
  info(`Creating TypeScript(${ts.version}) program with configuration file ${tsconfig}`);

  // Parse tsconfig to get compiler options
  let programOptions;
  try {
    programOptions = createProgramOptions(tsconfig, undefined, canAccessFileSystem);
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

  programOptions.host = new IncrementalCompilerHost(programOptions.options, baseDir);
  const tsProgram = createStandardProgram(programOptions);

  // TypeScript normalizes file paths internally, so we can safely cast them
  const filesToAnalyze = tsProgram
    .getSourceFiles()
    .map(sf => sf.fileName as NormalizedAbsolutePath)
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

    await analyzeFile(
      fileName,
      files[fileName],
      jsTsConfigFields,
      tsProgram,
      results,
      pendingFiles,
      progressReport,
      incrementalResultsChannel,
      cssRules,
    );
  }
}
