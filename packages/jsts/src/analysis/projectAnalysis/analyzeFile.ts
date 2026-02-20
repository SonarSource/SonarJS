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
import type { JsTsAnalysisInput } from '../analysis.js';
import { analyzeHTML } from '../../../../html/src/index.js';
import { analyzeYAML } from '../../../../yaml/src/index.js';
import { analyzeJSTS } from '../analyzer.js';
import {
  isAlsoCssFile,
  isCssFile,
  isHtmlFile,
  isYamlFile,
  type JsTsConfigFields,
} from '../../../../shared/src/helpers/configuration.js';
import { inferLanguage } from '../../../../shared/src/helpers/sanitize.js';
import { type WsIncrementalResult, serializeError } from '../../../../bridge/src/request.js';
import type { FileResult, ProjectAnalysisOutput, JsTsFile } from './projectAnalysis.js';
import type { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { handleFileResult } from './handleFileResult.js';
import type ts from 'typescript';
import type { NormalizedAbsolutePath } from '../../rules/helpers/index.js';
import type { EmbeddedAnalysisInput } from '../../embedded/analysis/analysis.js';
import type { ShouldIgnoreFileParams } from '../../../../shared/src/helpers/filter/filter.js';
import { analyzeCSS } from '../../../../css/src/analysis/analyzer.js';
import { linter as cssLinter } from '../../../../css/src/linter/wrapper.js';
import { error } from '../../../../shared/src/helpers/logging.js';

/**
 * Analyzes a single file, optionally with a TypeScript program for type-checking.
 * This is the common entry point for all analysis paths (with program, without program, with cache).
 * Takes a StoredJsTsFile (minimal fields) and completes it into a full JsTsAnalysisInput.
 *
 * Pure CSS files are dispatched to stylelint and skip the JS/TS pipeline entirely.
 * Vue and web files (.vue, .html, .htm, .xhtml) get both JS/TS and CSS analysis.
 *
 * CSS analysis uses the pre-initialized CSS linter singleton (see LinterWrapper.initialize()),
 * which is set up in analyzeProject before any files are analyzed.
 *
 * @param fileName - The normalized absolute path of the file to analyze
 * @param file - The stored file data (filePath, fileContent, fileType, fileStatus)
 * @param configFields - Configuration fields for analysis behavior (from caller's config source)
 * @param program - Optional TypeScript program for type-checking
 * @param results - Output object to accumulate analysis results
 * @param pendingFiles - Set of files not yet analyzed (for progress tracking)
 * @param progressReport - Progress reporter for logging
 * @param incrementalResultsChannel - Optional callback for incremental result streaming
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
) {
  progressReport.nextFile(fileName);

  // Extract shouldIgnoreParams separately as it's not part of JsTsAnalysisInput
  const { shouldIgnoreParams, ...jsTsConfigFields } = configFields;

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

  // Run analysis through the unified dispatcher (with error handling)
  const result = await analyzeInput(input, shouldIgnoreParams);

  // For Vue and web files: also run stylelint CSS analysis on <style> blocks.
  // Mirrors CssRuleSensor.getInputFiles() in Java (vueFilePredicate + webFilePredicate).
  if (cssLinter.isInitialized() && !('error' in result) && isAlsoCssFile(fileName)) {
    try {
      const cssOutput = await analyzeCSS(
        {
          filePath: file.filePath,
          fileContent: file.fileContent,
          sonarlint: configFields.sonarlint,
        },
        shouldIgnoreParams,
      );
      if ('issues' in result) {
        result.issues.push(...cssOutput.issues);
      }
    } catch (e) {
      error(`CSS analysis failed for ${fileName}: ${e}`);
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
 * Safely analyze a file wrapping raised exceptions in the output format
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

async function getAnalyzerForFile(
  input: JsTsAnalysisInput,
  shouldIgnoreParams: ShouldIgnoreFileParams,
): Promise<FileResult> {
  const filename = input.filePath;
  if (isCssFile(filename, shouldIgnoreParams.cssSuffixes)) {
    if (!cssLinter.isInitialized()) {
      // No CSS rules active — skip the file entirely
      return { issues: [] };
    }
    return analyzeCSS(
      {
        filePath: input.filePath,
        fileContent: input.fileContent,
        sonarlint: input.sonarlint,
      },
      shouldIgnoreParams,
    );
  } else if (isHtmlFile(filename)) {
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
