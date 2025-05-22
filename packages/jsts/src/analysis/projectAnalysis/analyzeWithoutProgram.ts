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
import { fieldsForJsTsAnalysisInput } from '../../../../shared/src/helpers/configuration.js';
import { debug } from '../../../../shared/src/helpers/logging.js';
import { relative } from 'node:path/posix';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import type { MessagePort } from 'node:worker_threads';
import { handleFileResult } from './handleFileResult.js';

/**
 * Analyzes files without type-checking.
 *
 * @param filenames the list of files to analyze.
 * @param files the list of files objects containing the files input data.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param baseDir the base directory of the project
 * @param progressReport progress report to log analyzed files
 * @param parentThread if provided, send the result via this channel
 */
export async function analyzeWithoutProgram(
  filenames: Set<string>,
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  baseDir: string,
  progressReport: ProgressReport,
  parentThread?: MessagePort,
) {
  for (const filename of filenames) {
    debug(`File not part of any tsconfig.json: ${relative(baseDir, filename)}`);
    progressReport.nextFile(filename);
    results.meta?.filesWithoutTypeChecking.push(filename);
    const result = await analyzeFile({
      ...files[filename],
      ...fieldsForJsTsAnalysisInput(),
    });
    handleFileResult(result, filename, results, parentThread);
  }
}
