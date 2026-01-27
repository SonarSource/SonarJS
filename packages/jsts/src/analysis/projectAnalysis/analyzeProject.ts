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
import type { ProjectAnalysisInput, ProjectAnalysisOutput } from './projectAnalysis.js';
import { analyzeWithProgram } from './analyzeWithProgram.js';
import { analyzeWithIncrementalProgram } from './analyzeWithIncrementalProgram.js';
import { analyzeWithoutProgram } from './analyzeWithoutProgram.js';
import { Linter } from '../../linter/linter.js';
import {
  setGlobalConfiguration,
  isSonarLint,
  getGlobals,
  getEnvironments,
  getBaseDir,
} from '../../../../shared/src/helpers/configuration.js';
import { getFilesToAnalyze } from './file-stores/index.js';
import { info, error } from '../../../../shared/src/helpers/logging.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { setSourceFilesContext } from '../../program/cache/sourceFileCache.js';

const analysisStatus = {
  cancelled: false,
};

export function cancelAnalysis() {
  analysisStatus.cancelled = true;
}

export function isAnalysisCancelled() {
  return analysisStatus.cancelled;
}

/**
 * Analyzes a JavaScript / TypeScript project in a single run
 *
 * @param input the JavaScript / TypeScript project to analyze
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 * @returns the JavaScript / TypeScript project analysis output
 */
export async function analyzeProject(
  input: ProjectAnalysisInput,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
): Promise<ProjectAnalysisOutput> {
  analysisStatus.cancelled = false;
  const { rules, files, configuration = {}, bundles = [], rulesWorkdir } = input;
  const results: ProjectAnalysisOutput = {
    files: {},
    meta: {
      warnings: [],
    },
  };
  setGlobalConfiguration(configuration);
  const { filesToAnalyze, pendingFiles } = await getFilesToAnalyze(getBaseDir(), files);
  setSourceFilesContext(filesToAnalyze);
  await Linter.initialize({
    rules,
    environments: getEnvironments(),
    globals: getGlobals(),
    sonarlint: isSonarLint(),
    bundles,
    baseDir: getBaseDir(),
    rulesWorkdir,
  });
  const progressReport = new ProgressReport(pendingFiles.size);
  if (pendingFiles.size) {
    if (isSonarLint()) {
      await analyzeWithIncrementalProgram(
        filesToAnalyze,
        results,
        pendingFiles,
        progressReport,
        incrementalResultsChannel,
      );
    } else {
      await analyzeWithProgram(
        filesToAnalyze,
        results,
        pendingFiles,
        progressReport,
        incrementalResultsChannel,
      );
    }
    if (pendingFiles.size) {
      info(
        `Found ${pendingFiles.size} file(s) not part of any tsconfig.json: they will be analyzed without type information`,
      );
      await analyzeWithoutProgram(
        pendingFiles,
        filesToAnalyze,
        results,
        progressReport,
        incrementalResultsChannel,
      );
    }
  }
  progressReport.stop();
  if (analysisStatus.cancelled) {
    error('Analysis has been cancelled');
    incrementalResultsChannel?.({ messageType: 'cancelled' });
  } else {
    incrementalResultsChannel?.({ ...results.meta, messageType: 'meta' });
  }
  return results;
}
