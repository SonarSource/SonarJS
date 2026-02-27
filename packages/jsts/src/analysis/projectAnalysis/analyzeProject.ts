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
import {
  type ProjectAnalysisInput,
  type ProjectAnalysisOutput,
  createFileResults,
} from './projectAnalysis.js';
import { analyzeWithProgram } from './analyzeWithProgram.js';
import { analyzeWithIncrementalProgram } from './analyzeWithIncrementalProgram.js';
import { analyzeWithoutProgram } from './analyzeWithoutProgram.js';
import { Linter } from '../../linter/linter.js';
import { linter as cssLinter } from '../../../../css/src/linter/wrapper.js';
import {
  type Configuration,
  getJsTsConfigFields,
  isJsTsFile,
} from '../../../../shared/src/helpers/configuration.js';
import { info, error } from '../../../../shared/src/helpers/logging.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import type { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { setSourceFilesContext } from '../../program/cache/sourceFileCache.js';
import { sourceFileStore } from './file-stores/index.js';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';

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
 * @param configuration the configuration instance with analysis settings
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 * @returns the JavaScript / TypeScript project analysis output
 */
export async function analyzeProject(
  input: ProjectAnalysisInput,
  configuration: Configuration,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
): Promise<ProjectAnalysisOutput> {
  analysisStatus.cancelled = false;
  const { rules, bundles, rulesWorkdir } = input;
  const filesToAnalyze = sourceFileStore.getFiles();

  // All files go into pendingFiles — analyzeFile decides per-file whether to
  // run JS/TS analysis, CSS analysis, or both (for Vue/HTML files).
  const pendingFiles = new Set(Object.keys(filesToAnalyze) as NormalizedAbsolutePath[]);

  const results: ProjectAnalysisOutput = {
    files: createFileResults(),
    meta: {
      warnings: [],
    },
  };
  const { baseDir, environments, globals, sonarlint, canAccessFileSystem } = configuration;
  const jsTsConfigFields = getJsTsConfigFields(configuration);
  setSourceFilesContext(filesToAnalyze);
  await Linter.initialize({
    rules,
    environments,
    globals,
    sonarlint,
    bundles,
    baseDir,
    rulesWorkdir,
  });

  // Initialize CSS linter with active CSS rules (mirrors Linter.initialize for JS/TS).
  // Always called to reset state between analysis runs: when cssRules is empty,
  // the linter is reset to uninitialized so CSS analysis is correctly skipped.
  cssLinter.initialize(input.cssRules ?? []);

  const progressReport = new ProgressReport(pendingFiles.size);
  if (pendingFiles.size) {
    if (jsTsConfigFields.disableTypeChecking) {
      info(
        'Type checking is disabled (sonar.javascript.disableTypeChecking=true). All files will be analyzed without type information.',
      );
    } else if (sonarlint && rules.length) {
      await analyzeWithIncrementalProgram(
        filesToAnalyze,
        results,
        pendingFiles,
        progressReport,
        baseDir,
        canAccessFileSystem,
        jsTsConfigFields,
        incrementalResultsChannel,
      );
    } else if (rules.length) {
      await analyzeWithProgram(
        filesToAnalyze,
        results,
        pendingFiles,
        progressReport,
        baseDir,
        canAccessFileSystem,
        jsTsConfigFields,
        incrementalResultsChannel,
      );
    }
    if (pendingFiles.size) {
      const pendingJsTsCount = Array.from(pendingFiles).filter(filePath =>
        isJsTsFile(filePath, jsTsConfigFields.shouldIgnoreParams),
      ).length;
      if (pendingJsTsCount > 0) {
        info(
          `Found ${pendingJsTsCount} JS/TS file(s) not part of any tsconfig.json: they will be analyzed without type information`,
        );
      }
      await analyzeWithoutProgram(
        pendingFiles,
        filesToAnalyze,
        results,
        progressReport,
        baseDir,
        jsTsConfigFields,
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
