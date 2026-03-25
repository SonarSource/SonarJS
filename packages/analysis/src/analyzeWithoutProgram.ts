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
import type { AnalyzableFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { isJsTsFile } from './common/configuration.js';
import { warn } from '../../shared/src/helpers/logging.js';
import { relative } from 'node:path/posix';
import type { ProgressReport } from './common/progress-report.js';
import type { WsIncrementalResult } from './incremental-result.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import { analyzeFile } from './analyzeFile.js';
import type { NormalizedAbsolutePath } from '../jsts/src/rules/helpers/files.js';
import type { JsTsConfigFields } from './common/configuration.js';

/**
 * Analyzes files without type-checking.
 *
 * @param filenames the list of files to analyze.
 * @param files the list of files objects containing the files input data.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param progressReport progress report to log analyzed files
 * @param baseDir the base directory for the project
 * @param jsTsConfigFields configuration fields for JS/TS analysis
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 */
export async function analyzeWithoutProgram(
  filenames: Set<NormalizedAbsolutePath>,
  files: AnalyzableFiles,
  results: ProjectAnalysisOutput,
  progressReport: ProgressReport,
  baseDir: NormalizedAbsolutePath,
  jsTsConfigFields: JsTsConfigFields,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  const { jsSuffixes, tsSuffixes } = jsTsConfigFields.shouldIgnoreParams;
  for (const filename of filenames) {
    if (isAnalysisCancelled()) {
      return;
    }
    const relativePath = relative(baseDir, filename);
    if (
      isJsTsFile(filename, {
        jsSuffixes,
        tsSuffixes,
      })
    ) {
      warn(
        `JS/TS file analyzed without type-checking (not part of any tsconfig.json): ${relativePath}`,
      );
    }
    await analyzeFile(
      filename,
      files[filename],
      jsTsConfigFields,
      undefined,
      results,
      undefined,
      progressReport,
      incrementalResultsChannel,
    );
  }
}

