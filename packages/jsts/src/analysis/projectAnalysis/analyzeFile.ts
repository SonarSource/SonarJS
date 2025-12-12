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
import { serializeError, WsIncrementalResult } from '../../../../bridge/src/request.js';
import { FileResult, JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { handleFileResult } from './handleFileResult.js';
import ts from 'typescript';

/**
 * Analyzes a single file, optionally with a TypeScript program for type-checking.
 * This is the common entry point for all analysis paths (with program, without program, with cache).
 */
export async function analyzeSingleFile(
  fileName: string,
  file: JsTsFiles[string],
  program: ts.Program | undefined,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string> | undefined,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  progressReport.nextFile(fileName);

  // Build analysis input
  const input: JsTsAnalysisInput = {
    ...file,
    ...(program ? { program } : {}),
    ...fieldsForJsTsAnalysisInput(),
  };

  // Analyze the file (with error handling)
  const result = await analyzeFile(input);

  if (pendingFiles) {
    pendingFiles.delete(fileName);
  }
  handleFileResult(result, fileName, results, incrementalResultsChannel);
}

/**
 * Safely analyze a JavaScript/TypeScript file wrapping raised exceptions in the output format
 * @param input JsTsAnalysisInput object containing all the data necessary for the analysis
 */
async function analyzeFile(input: JsTsAnalysisInput): Promise<FileResult> {
  try {
    return await getAnalyzerForFile(input.filePath)(input);
  } catch (e) {
    return handleError(serializeError(e));
  }
}

function getAnalyzerForFile(filename: string) {
  if (isHtmlFile(filename)) {
    return analyzeHTML;
  } else if (isYamlFile(filename)) {
    return analyzeYAML;
  } else {
    return analyzeJSTS;
  }
}
