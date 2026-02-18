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

  // Mirrors CssRuleSensor.getInputFiles() in Java which has three predicates:
  //   1. CSS language files (.css, .less, .scss, .sass) — stylelint only
  //   2. Vue files (.vue) — both ESLint (script) and stylelint (style)
  //   3. Web files (.html, .htm, .xhtml) — both embedded ESLint and stylelint
  const CSS_ALSO_FILES_EXTENSIONS = ['.vue', '.html', '.htm', '.xhtml'];

  for (const filePath of Object.keys(filesToAnalyze) as NormalizedAbsolutePath[]) {
    if (isCssFile(filePath, configuration.cssSuffixes)) {
      // Pure CSS file — stylelint only, does not go through ESLint
      cssFiles.push([filePath, filesToAnalyze[filePath]]);
    } else {
      // All other files go through ESLint (JS/TS, Vue, HTML, etc.)
      pendingFiles.add(filePath);
      // Vue and web files also get stylelint analysis for their <style> blocks
      if (CSS_ALSO_FILES_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
        cssFiles.push([filePath, filesToAnalyze[filePath]]);
      }
    }
  }

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

  // Analyze CSS/Vue/HTML files with stylelint — runs AFTER JS/TS so that for
  // Vue and HTML files the CSS issues can be merged into the existing JS result.
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
        const cssIssues = cssOutput.issues.map(issue => ({ ...issue }));
        const existingResult = results.files[filePath];
        if (existingResult && !('cssIssues' in existingResult) && !('error' in existingResult)) {
          // Vue/HTML file already has a JS/TS result — inject cssIssues alongside it.
          // The response transformer checks both 'issues' and 'cssIssues' independently.
          (existingResult as Record<string, unknown>).cssIssues = cssIssues;
        } else if (!existingResult) {
          // Pure CSS file — store as CssFileResult
          results.files[filePath] = { cssIssues } as CssFileResult;
        }
      } catch (err) {
        if (!results.files[filePath]) {
          results.files[filePath] = { error: String(err) };
        }
      }
    }
  }

  if (analysisStatus.cancelled) {
    error('Analysis has been cancelled');
    incrementalResultsChannel?.({ messageType: 'cancelled' });
  } else {
    incrementalResultsChannel?.({ ...results.meta, messageType: 'meta' });
  }
  return results;
}
