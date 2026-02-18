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
  type CssFileResult,
  createFileResults,
} from './projectAnalysis.js';
import { analyzeWithProgram } from './analyzeWithProgram.js';
import { analyzeWithIncrementalProgram } from './analyzeWithIncrementalProgram.js';
import { analyzeWithoutProgram } from './analyzeWithoutProgram.js';
import { Linter } from '../../linter/linter.js';
import {
  type Configuration,
  getJsTsConfigFields,
  isCssFile,
  getShouldIgnoreParams,
} from '../../../../shared/src/helpers/configuration.js';
import { info, error } from '../../../../shared/src/helpers/logging.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { setSourceFilesContext } from '../../program/cache/sourceFileCache.js';
import { sourceFileStore } from './file-stores/index.js';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { analyzeCSS } from '../../../../css/src/analysis/analyzer.js';

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

  // Separate CSS files -- they need stylelint, not ESLint
  const cssFiles: Array<[NormalizedAbsolutePath, (typeof filesToAnalyze)[NormalizedAbsolutePath]]> =
    [];
  const pendingFiles = new Set<NormalizedAbsolutePath>();

  for (const filePath of Object.keys(filesToAnalyze) as NormalizedAbsolutePath[]) {
    if (isCssFile(filePath, configuration.cssSuffixes)) {
      cssFiles.push([filePath, filesToAnalyze[filePath]]);
      // .vue files also go through JS/TS analysis for their script blocks
      if (filePath.endsWith('.vue')) {
        pendingFiles.add(filePath);
      }
    } else {
      pendingFiles.add(filePath);
    }
  }

  const results: ProjectAnalysisOutput = {
    files: createFileResults(),
    meta: {
      warnings: [],
    },
  };

  // Analyze CSS files with stylelint
  const cssRules = input.cssRules ?? [];
  if (cssFiles.length > 0 && cssRules.length > 0) {
    const shouldIgnoreParams = getShouldIgnoreParams(configuration);
    for (const [filePath, file] of cssFiles) {
      try {
        const cssOutput = await analyzeCSS(
          {
            filePath,
            fileContent: file.fileContent,
            rules: cssRules,
            sonarlint: configuration.sonarlint,
          },
          shouldIgnoreParams,
        );
        // Store with ruleId as stylelint key -- the gRPC response transformer
        // will reverse-map it back to the SQ key using reverseCssRuleKeyMap
        results.files[filePath] = {
          cssIssues: cssOutput.issues.map(issue => ({ ...issue })),
        } as CssFileResult;
      } catch (err) {
        results.files[filePath] = { error: String(err) };
      }
    }
  }
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
  const progressReport = new ProgressReport(pendingFiles.size);
  if (pendingFiles.size) {
    if (sonarlint) {
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
    } else {
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
      info(
        `Found ${pendingFiles.size} file(s) not part of any tsconfig.json: they will be analyzed without type information`,
      );
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
