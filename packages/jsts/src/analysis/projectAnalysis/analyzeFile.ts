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
import { handleError } from '../../../../bridge/src/errors/index.js';
import { JsTsAnalysisInput } from '../analysis.js';
import { analyzeHTML } from '../../../../html/src/index.js';
import { analyzeYAML } from '../../../../yaml/src/index.js';
import { analyzeJSTS } from '../analyzer.js';
import {
  isCssFile,
  isHtmlFile,
  isYamlFile,
  type JsTsConfigFields,
} from '../../../../shared/src/helpers/configuration.js';
import { inferLanguage } from '../../../../shared/src/helpers/sanitize.js';
import { serializeError, WsIncrementalResult } from '../../../../bridge/src/request.js';
import { CssFileResult, FileResult, ProjectAnalysisOutput, JsTsFile } from './projectAnalysis.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { handleFileResult } from './handleFileResult.js';
import ts from 'typescript';
import { NormalizedAbsolutePath } from '../../rules/helpers/index.js';
import { EmbeddedAnalysisInput } from '../../embedded/analysis/analysis.js';
import { ShouldIgnoreFileParams } from '../../../../shared/src/helpers/filter/filter.js';
import { analyzeCSS } from '../../../../css/src/analysis/analyzer.js';
import type { RuleConfig as CssRuleConfig } from '../../../../css/src/linter/config.js';

/**
 * Analyzes a single file, optionally with a TypeScript program for type-checking.
 * This is the common entry point for all analysis paths (with program, without program, with cache).
 * Takes a StoredJsTsFile (minimal fields) and completes it into a full JsTsAnalysisInput.
 *
 * Pure CSS files are dispatched to stylelint and skip the JS/TS pipeline entirely.
 * Vue and web files (.vue, .html, .htm, .xhtml) get both JS/TS and CSS analysis.
 *
 * @param fileName - The normalized absolute path of the file to analyze
 * @param file - The stored file data (filePath, fileContent, fileType, fileStatus)
 * @param configFields - Configuration fields for analysis behavior (from caller's config source)
 * @param program - Optional TypeScript program for type-checking
 * @param results - Output object to accumulate analysis results
 * @param pendingFiles - Set of files not yet analyzed (for progress tracking)
 * @param progressReport - Progress reporter for logging
 * @param incrementalResultsChannel - Optional callback for incremental result streaming
 * @param cssRules - Optional CSS rule configuration for stylelint analysis
 */
export async function analyzeFile(
  fileName: NormalizedAbsolutePath,
  file: JsTsFile,
  configFields: JsTsConfigFields,
  program: ts.Program | undefined,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<NormalizedAbsolutePath> | undefined,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
  cssRules?: CssRuleConfig[],
) {
  progressReport.nextFile(fileName);

  // Extract shouldIgnoreParams separately as it's not part of JsTsAnalysisInput
  const { shouldIgnoreParams, ...jsTsConfigFields } = configFields;

  // Pure CSS file — dispatch to stylelint, skip the JS/TS pipeline entirely
  if (isCssFile(fileName, shouldIgnoreParams.cssSuffixes)) {
    if (cssRules && cssRules.length > 0) {
      let result: CssFileResult | { error: string };
      try {
        const cssOutput = await analyzeCSS(
          {
            filePath: file.filePath,
            fileContent: file.fileContent,
            rules: cssRules,
            sonarlint: configFields.sonarlint,
          },
          shouldIgnoreParams,
        );
        result = { cssIssues: cssOutput.issues.map(issue => ({ ...issue })) };
      } catch (e) {
        result = handleError(serializeError(e));
      }
      handleFileResult(result as FileResult, fileName, results, incrementalResultsChannel);
    }
    if (pendingFiles) pendingFiles.delete(fileName);
    return;
  }

  // Build complete analysis input from stored file and provided configuration
  // jsTsConfigFields provides config-based values (analysisMode, skipAst, etc.)
  // Per-file fields (filePath, fileContent, fileType, fileStatus) come from the stored file
  const input: JsTsAnalysisInput = {
    ...jsTsConfigFields,
    filePath: file.filePath,
    fileContent: file.fileContent,
    fileType: file.fileType,
    fileStatus: file.fileStatus,
    language: inferLanguageForProjectAnalysis(file.filePath, file.fileContent),
    tsConfigs: [],
    program,
  };

  // Run JS/TS analysis (with error handling)
  const result = await analyzeInput(input, shouldIgnoreParams);

  // For Vue and web files: also run stylelint CSS analysis on <style> blocks.
  // Mirrors CssRuleSensor.getInputFiles() in Java (vueFilePredicate + webFilePredicate).
  const CSS_ALSO_EXTENSIONS = ['.vue', '.html', '.htm', '.xhtml'];
  if (
    cssRules &&
    cssRules.length > 0 &&
    !('error' in result) &&
    CSS_ALSO_EXTENSIONS.some(ext => fileName.endsWith(ext))
  ) {
    try {
      const cssOutput = await analyzeCSS(
        {
          filePath: file.filePath,
          fileContent: file.fileContent,
          rules: cssRules,
          sonarlint: configFields.sonarlint,
        },
        shouldIgnoreParams,
      );
      (result as Record<string, unknown>).cssIssues = cssOutput.issues.map(issue => ({
        ...issue,
      }));
    } catch {
      // CSS analysis failure does not fail the file — JS/TS result is still reported
    }
  }

  if (pendingFiles) {
    pendingFiles.delete(fileName);
  }
  handleFileResult(result, fileName, results, incrementalResultsChannel);
}

/**
 * Infers the language (js or ts) from file path and content.
 * For HTML/YAML embedded analysis, defaults to 'js' if language cannot be inferred.
 */
function inferLanguageForProjectAnalysis(
  filePath: NormalizedAbsolutePath,
  fileContent: string,
): 'js' | 'ts' {
  try {
    return inferLanguage(undefined, filePath, fileContent);
  } catch {
    // Default to 'js' for HTML/YAML embedded analysis
    return 'js';
  }
}

/**
 * Safely analyze a JavaScript/TypeScript file wrapping raised exceptions in the output format
 * @param input JsTsAnalysisInput object containing all the data necessary for the analysis
 * @param shouldIgnoreParams parameters for file filtering
 */
async function analyzeInput(
  input: JsTsAnalysisInput,
  shouldIgnoreParams: ShouldIgnoreFileParams,
): Promise<FileResult> {
  try {
    return await getAnalyzerForFile(input, shouldIgnoreParams);
  } catch (e) {
    return handleError(serializeError(e));
  }
}

function getAnalyzerForFile(
  input: JsTsAnalysisInput,
  shouldIgnoreParams: ShouldIgnoreFileParams,
): Promise<FileResult> {
  const filename = input.filePath;
  if (isHtmlFile(filename)) {
    const embeddedInput: EmbeddedAnalysisInput = {
      filePath: input.filePath,
      fileContent: input.fileContent,
      sonarlint: input.sonarlint,
    };
    return analyzeHTML(embeddedInput, shouldIgnoreParams);
  } else if (isYamlFile(filename)) {
    const embeddedInput: EmbeddedAnalysisInput = {
      filePath: input.filePath,
      fileContent: input.fileContent,
      sonarlint: input.sonarlint,
    };
    return analyzeYAML(embeddedInput, shouldIgnoreParams);
  } else {
    return analyzeJSTS(input, shouldIgnoreParams);
  }
}
