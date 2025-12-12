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
import { debug } from '../../../../shared/src/helpers/logging.js';
import { relative } from 'node:path/posix';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import { analyzeSingleFile } from './analyzeFile.js';

/**
 * Analyzes files without type-checking.
 *
 * @param filenames the list of files to analyze.
 * @param files the list of files objects containing the files input data.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param progressReport progress report to log analyzed files
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 */
export async function analyzeWithoutProgram(
  filenames: Set<string>,
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  for (const filename of filenames) {
    if (isAnalysisCancelled()) {
      return;
    }
    debug(`File not part of any tsconfig.json: ${relative(getBaseDir(), filename)}`);
    await analyzeSingleFile(
      filename,
      files[filename],
      undefined,
      results,
      undefined,
      progressReport,
      incrementalResultsChannel,
    );
  }
}
