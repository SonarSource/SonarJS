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

/**
 * Analyzes JavaScript / TypeScript files using typescript-eslint programCreation instead
 * of creating the program manually.
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
  for (const [filename, file] of Object.entries(files)) {
    if (isJsTsFile(filename)) {
      const tsconfig = tsConfigStore.getTsConfigForInputFile(filename);
      progressReport.nextFile(filename);
      const result = await analyzeFile({
        ...file,
        tsConfigs: tsconfig ? [tsconfig] : undefined,
        ...fieldsForJsTsAnalysisInput(),
      });
      pendingFiles.delete(filename);
      handleFileResult(result, filename, results, incrementalResultsChannel);
      if (!pendingFiles.size) {
        break;
      }
    }
  }
}
