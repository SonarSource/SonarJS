/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { Linter } from './jsts/linter/linter.js';
import { linter as cssLinter } from './css/linter/wrapper.js';
import {
  type Configuration,
  getFilterPathParams,
  getJsTsConfigFields,
  isJsTsFile,
} from './common/configuration.js';
import { info, error } from '../../shared/src/helpers/logging.js';
import { ProgressReport } from './common/progress-report.js';
import type { WsIncrementalResult } from './incremental-result.js';
import {
  clearSourceFileContentCache,
  setSourceFilesContext,
} from './jsts/program/cache/sourceFileCache.js';
import { generatedSourceStore, sourceFileStore } from './file-stores/index.js';
import type { NormalizedAbsolutePath } from '../../shared/src/helpers/files.js';
import {
  getProjectAnalysisTelemetry,
  getProjectAnalysisTelemetryCollector,
  resetProjectAnalysisTelemetry,
} from './telemetry.js';

type AnalysisStatus = {
  cancelled: boolean;
};

// The analysis worker processes one project request at a time. The gRPC handler opens this
// scope before normalization so cancellation also reaches preparation; standalone callers
// get their own scope in analyzeProject().
let analysisStatus: AnalysisStatus | undefined;

/**
 * Runs an operation in a fresh cancellation scope.
 *
 * Request handlers can use this to make cancellation effective while they prepare an analysis,
 * before calling {@link analyzeProject}.
 */
export async function withAnalysisCancellation<T>(operation: () => Promise<T>): Promise<T> {
  const currentAnalysisStatus: AnalysisStatus = { cancelled: false };
  analysisStatus = currentAnalysisStatus;
  try {
    return await operation();
  } finally {
    if (analysisStatus === currentAnalysisStatus) {
      analysisStatus = undefined;
    }
  }
}

export function cancelAnalysis(): boolean {
  if (!analysisStatus) {
    return false;
  }
  analysisStatus.cancelled = true;
  return true;
}

export function isAnalysisCancelled() {
  return analysisStatus?.cancelled ?? false;
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
  try {
    if (!analysisStatus) {
      // Keep the outer finally below pending until the nested analysis has settled.
      return await withAnalysisCancellation(() =>
        analyzeProjectWithCancellation(input, configuration, incrementalResultsChannel),
      );
    }
    return await analyzeProjectWithCancellation(input, configuration, incrementalResultsChannel);
  } finally {
    // Scanner requests are independent. The last ESLint SourceCode retains its parser services,
    // including the entire TypeScript Program; the parsed SourceFile cache also remains live.
    // Release both before the next request loads another filesystem archive or TS program.
    if (!configuration.sonarlint) {
      Linter.releaseAfterAnalysis();
      clearSourceFileContentCache();
    }
  }
}

async function analyzeProjectWithCancellation(
  input: ProjectAnalysisInput,
  configuration: Configuration,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
): Promise<ProjectAnalysisOutput> {
  const { rules, bundles, rulesWorkdir, programSelection } = input;
  const filesToAnalyze = sourceFileStore.getFiles();
  // All files go into pendingFiles - analyzeFile decides per-file whether to
  // run JS/TS analysis, CSS analysis, or both (for Vue/HTML files).
  const pendingFiles = new Set(Object.keys(filesToAnalyze) as NormalizedAbsolutePath[]);

  const results: ProjectAnalysisOutput = {
    files: createFileResults(),
    meta: {
      warnings: [],
    },
  };
  const { baseDir, environments, globals, sonarlint, canAccessFileSystem } = configuration;
  resetProjectAnalysisTelemetry();
  getProjectAnalysisTelemetryCollector().recordGeneratedSources(
    generatedSourceStore.observeGeneratedSources(configuration, filesToAnalyze),
  );
  const jsTsConfigFields = getJsTsConfigFields(configuration);
  setSourceFilesContext(filesToAnalyze);
  const { testFileExtensions } = getFilterPathParams(configuration);
  await Linter.initialize({
    rules,
    environments,
    globals,
    bundles,
    baseDir,
    detectGeneratedCode: configuration.detectGeneratedCode,
    isGeneratedSourceFile: filePath => generatedSourceStore.getFamily(filePath) !== undefined,
    rulesWorkdir,
    testFileExtensions,
  });

  // Initialize CSS linter with active CSS rules (mirrors Linter.initialize for JS/TS).
  // Always called to reset state between analysis runs: when cssRules is empty,
  // the linter is reset to uninitialized so CSS analysis is correctly skipped.
  cssLinter.initialize(input.cssRules ?? [], baseDir);

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
        programSelection,
        incrementalResultsChannel,
      );
    }
    if (pendingFiles.size) {
      const noProgramFiles = Array.from(pendingFiles).filter(filePath =>
        isJsTsFile(filePath, jsTsConfigFields.shouldIgnoreParams),
      );
      const pendingJsTsCount = noProgramFiles.length;
      if (pendingJsTsCount > 0 && !jsTsConfigFields.disableTypeChecking) {
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
      recordNoProgramOutcomes(noProgramFiles, programSelection);
    }
  }
  progressReport.stop();
  if (isAnalysisCancelled()) {
    error('Analysis has been cancelled');
    incrementalResultsChannel?.({ messageType: 'cancelled' });
  } else {
    results.meta.telemetry = getProjectAnalysisTelemetry();
    incrementalResultsChannel?.({ ...results.meta, messageType: 'meta' });
  }
  return results;
}

function recordNoProgramOutcomes(
  files: NormalizedAbsolutePath[],
  programSelection: ProjectAnalysisInput['programSelection'],
): void {
  // An orphan group records its program before analyzing its first file. On cancellation,
  // unprocessed group members remain pending but must not acquire a second outcome.
  if (isAnalysisCancelled()) {
    return;
  }
  for (const file of files) {
    programSelection?.recordNoProgram(file);
  }
}
