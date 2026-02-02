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
  isHtmlFile,
  isYamlFile,
  fieldsForJsTsAnalysisInput,
} from '../../../../shared/src/helpers/configuration.js';
import { inferLanguage } from '../../../../shared/src/helpers/sanitize.js';
import { serializeError, WsIncrementalResult } from '../../../../bridge/src/request.js';
import { FileResult, ProjectAnalysisOutput, StoredJsTsFile } from './projectAnalysis.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { handleFileResult } from './handleFileResult.js';
import ts from 'typescript';
import { NormalizedAbsolutePath } from '../../rules/helpers/index.js';
import { EmbeddedAnalysisInput } from '../../embedded/analysis/analysis.js';

/**
 * Analyzes a single file, optionally with a TypeScript program for type-checking.
 * This is the common entry point for all analysis paths (with program, without program, with cache).
 * Takes a StoredJsTsFile (minimal fields) and completes it into a full JsTsAnalysisInput.
 */
export async function analyzeFile(
  fileName: NormalizedAbsolutePath,
  file: StoredJsTsFile,
  program: ts.Program | undefined,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<NormalizedAbsolutePath> | undefined,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  progressReport.nextFile(fileName);

  // Build complete analysis input from stored file using global configuration
  // fieldsForJsTsAnalysisInput() provides config-based values (analysisMode, skipAst, etc.)
  // Per-file fields (filePath, fileContent, fileType, fileStatus) come from the stored file
  const input: JsTsAnalysisInput = {
    ...fieldsForJsTsAnalysisInput(),
    filePath: file.filePath,
    fileContent: file.fileContent,
    fileType: file.fileType,
    fileStatus: file.fileStatus,
    language: inferLanguageForProjectAnalysis(file.filePath, file.fileContent),
    tsConfigs: [],
    program,
  };

  // Analyze the file (with error handling)
  const result = await analyzeInput(input);

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
 */
async function analyzeInput(input: JsTsAnalysisInput): Promise<FileResult> {
  try {
    return await getAnalyzerForFile(input);
  } catch (e) {
    return handleError(serializeError(e));
  }
}

function getAnalyzerForFile(input: JsTsAnalysisInput): Promise<FileResult> {
  const filename = input.filePath;
  if (isHtmlFile(filename)) {
    const embeddedInput: EmbeddedAnalysisInput = {
      filePath: input.filePath,
      fileContent: input.fileContent,
      sonarlint: input.sonarlint,
    };
    return analyzeHTML(embeddedInput);
  } else if (isYamlFile(filename)) {
    const embeddedInput: EmbeddedAnalysisInput = {
      filePath: input.filePath,
      fileContent: input.fileContent,
      sonarlint: input.sonarlint,
    };
    return analyzeYAML(embeddedInput);
  } else {
    return analyzeJSTS(input);
  }
}
