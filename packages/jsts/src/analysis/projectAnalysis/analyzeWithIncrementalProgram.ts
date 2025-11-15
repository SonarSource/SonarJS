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
import { isJsTsFile, getBaseDir } from '../../../../shared/src/helpers/configuration.js';
import { tsConfigStore } from './file-stores/index.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import { mergeCompilerOptions, createOrGetCachedProgramForFile } from '../../program/program.js';
import { info } from '../../../../shared/src/helpers/logging.js';
import { fillFileContent } from '../../../../shared/src/types/analysis.js';
import { getProgramCacheManager } from '../../program/programCacheManager.js';
import { analyzeSingleFile } from './analyzeFile.js';

/**
 * Analyzes JavaScript / TypeScript files using cached SemanticDiagnosticsBuilderPrograms.
 * Creates programs directly (not via typescript-eslint) with merged compiler options from all tsconfigs.
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
  // Step 1: Merge compiler options from all discovered tsconfigs
  const tsconfigs = tsConfigStore.getTsConfigs();
  const mergedOptions = mergeCompilerOptions(tsconfigs);
  results.compilerOptions.push(mergedOptions);

  info(
    `Analyzing with cached programs: ${tsconfigs.length} tsconfig(s) merged, ${pendingFiles.size} file(s) to analyze`,
  );

  // Step 2: Collect file contents for all pending files upfront
  const fileContents = new Map<string, string>();
  for (const filename of pendingFiles) {
    if (files[filename]) {
      const filled = await fillFileContent(files[filename]);
      fileContents.set(filename, filled.fileContent);
    }
  }

  // Step 3: Analyze each file individually using cached programs
  let analyzedCount = 0;
  for (const [filename, file] of Object.entries(files)) {
    if (isAnalysisCancelled()) {
      return;
    }

    if (!isJsTsFile(filename) || !pendingFiles.has(filename)) {
      continue;
    }

    // Get or create cached program for this file
    const { program: builderProgram } = createOrGetCachedProgramForFile(
      getBaseDir(),
      filename,
      mergedOptions,
      fileContents,
    );

    // Extract underlying TypeScript program and analyze
    const tsProgram = builderProgram.getProgram();
    await analyzeSingleFile(
      filename,
      file,
      tsProgram,
      results,
      pendingFiles,
      progressReport,
      incrementalResultsChannel,
    );
    analyzedCount++;

    if (!pendingFiles.size) {
      break;
    }
  }

  // Step 4: Log cache statistics
  const cacheStats = getProgramCacheManager().getCacheStats();
  info(
    `Analysis complete: ${analyzedCount} file(s) analyzed, ` +
      `program cache: ${cacheStats.size}/${cacheStats.maxSize} entries, ` +
      `${cacheStats.totalFilesAcrossPrograms} total files cached`,
  );
}
