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
import { analyzeFile } from './analyzeFile.js';
import {
  fieldsForJsTsAnalysisInput,
  isJsTsFile,
} from '../../../../shared/src/helpers/configuration.js';
import { tsConfigStore } from './file-stores/index.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { handleFileResult } from './handleFileResult.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import { mergeCompilerOptions, createOrGetCachedProgramForFile } from '../../program/program.js';
import { info } from '../../../../shared/src/helpers/logging.js';
import { fillFileContent } from '../../../../shared/src/types/analysis.js';
import { getProgramCacheManager } from '../../program/programCacheManager.js';
import { getBaseDir } from '../../../../shared/src/helpers/configuration.js';

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
export async function analyzeWithWatchProgram(
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

  // Step 2: Analyze each file individually using cached programs
  let analyzedCount = 0;
  for (const [filename, file] of Object.entries(files)) {
    if (isAnalysisCancelled()) {
      return;
    }

    if (!isJsTsFile(filename) || !pendingFiles.has(filename)) {
      continue;
    }

    // Get file content
    const filled = await fillFileContent(file);

    // Get or create cached program for this file
    const { program: builderProgram } = createOrGetCachedProgramForFile(
      getBaseDir(),
      filename,
      filled.fileContent,
      mergedOptions,
    );

    // Extract underlying TypeScript program
    const tsProgram = builderProgram.getProgram();

    // Analyze the file
    progressReport.nextFile(filename);
    const result = await analyzeFile({
      ...file,
      program: tsProgram, // Pass the actual program, not tsConfigs
      ...fieldsForJsTsAnalysisInput(),
    });

    pendingFiles.delete(filename);
    handleFileResult(result, filename, results, incrementalResultsChannel);
    analyzedCount++;

    if (!pendingFiles.size) {
      break;
    }
  }

  // Step 3: Log cache statistics
  const cacheStats = getProgramCacheManager().getCacheStats();
  info(
    `Analysis complete: ${analyzedCount} file(s) analyzed, ` +
      `program cache: ${cacheStats.size}/${cacheStats.maxSize} entries, ` +
      `${cacheStats.totalFilesAcrossPrograms} total files cached`,
  );
}
