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
import { JsTsConfigFields, JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { isJsTsFile } from '../../../../shared/src/helpers/configuration.js';
import { debug, warn } from '../../../../shared/src/helpers/logging.js';
import { relative } from 'node:path/posix';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import { analyzeFile } from './analyzeFile.js';
import type { NormalizedAbsolutePath } from '../../rules/helpers/index.js';
import type { RuleConfig as CssRuleConfig } from '../../../../css/src/linter/config.js';

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
 * @param cssRules optional CSS rule configuration for stylelint analysis
 */
export async function analyzeWithoutProgram(
  filenames: Set<NormalizedAbsolutePath>,
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  progressReport: ProgressReport,
  baseDir: NormalizedAbsolutePath,
  jsTsConfigFields: JsTsConfigFields,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
  cssRules?: CssRuleConfig[],
) {
  const { jsSuffixes, tsSuffixes, cssSuffixes } = jsTsConfigFields.shouldIgnoreParams;
  for (const filename of filenames) {
    if (isAnalysisCancelled()) {
      return;
    }
    const relativePath = relative(baseDir, filename);
    if (isJsTsFile(filename, { jsSuffixes, tsSuffixes, cssSuffixes })) {
      warn(
        `JS/TS file analyzed without type-checking (not part of any tsconfig.json): ${relativePath}`,
      );
    } else {
      debug(`File not part of any tsconfig.json: ${relativePath}`);
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
      cssRules,
    );
  }
}
