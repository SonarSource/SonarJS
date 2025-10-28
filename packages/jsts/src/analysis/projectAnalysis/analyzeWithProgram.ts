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
import type { JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { createProgram, createProgramFromSingleFile } from '../../program/program.js';
import { analyzeFile } from './analyzeFile.js';
import { error, info, warn } from '../../../../shared/src/helpers/logging.js';
import { fieldsForJsTsAnalysisInput } from '../../../../shared/src/helpers/configuration.js';
import { tsConfigStore } from './file-stores/index.js';
import ts from 'typescript';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
import { handleFileResult } from './handleFileResult.js';
import type { WsIncrementalResult } from '../../../../bridge/src/request.js';
import { isAnalysisCancelled } from './analyzeProject.js';
import merge from 'lodash.merge';
import { fillFileContent } from '../../../../shared/src/types/analysis.js';

/**
 * Analyzes JavaScript / TypeScript files using TypeScript programs. Files not
 * included in any tsconfig from the cache will not be analyzed.
 *
 * @param files the list of JavaScript / TypeScript files to analyze.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param pendingFiles array of files which are still not analyzed, to keep track of progress
 *                     and avoid analyzing twice the same file
 * @param progressReport progress report to log analyzed files
 * @param incrementalResultsChannel if provided, a function to send results incrementally after each analyzed file
 */
export async function analyzeWithProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  const processedTSConfigs: Set<string> = new Set();
  for (const tsConfig of tsConfigStore.getTsConfigs()) {
    if (isAnalysisCancelled()) {
      return;
    }
    await analyzeFilesFromTsConfig(
      files,
      tsConfig,
      results,
      pendingFiles,
      processedTSConfigs,
      progressReport,
      incrementalResultsChannel,
    );
    if (!pendingFiles.size) {
      break;
    }
  }

  await analyzeFilesFromEntryPoint(
    files,
    results,
    pendingFiles,
    progressReport,
    incrementalResultsChannel,
  );
}

async function analyzeFilesFromEntryPoint(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  const compilerOptions: ts.CompilerOptions = merge({}, ...results.compilerOptions);

  for (const pendingFile of pendingFiles) {
    if (isAnalysisCancelled()) {
      return;
    }
    if (!pendingFiles.has(pendingFile) || !files[pendingFile]) {
      // pendingFiles is modified during the loop; when a file
      // was already analyzed from another entry point, it gets removed
      continue;
    }
    let program: ts.Program;
    info(`Creating TypeScript(${ts.version}) program from entry point ${pendingFile}`);
    try {
      program = createProgramFromSingleFile(
        pendingFile,
        (await fillFileContent(files[pendingFile])).fileContent,
        compilerOptions,
      );
    } catch (e) {
      error('Failed to create program: ' + e);
      results.meta.warnings.push(
        `Failed to create TypeScript program program from entry point ${pendingFile}.`,
      );
      return;
    }
    await analyzeProgram(
      program,
      files,
      results,
      pendingFiles,
      progressReport,
      incrementalResultsChannel,
    );
  }
}

async function analyzeFilesFromTsConfig(
  files: JsTsFiles,
  tsConfig: string,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  processedTSConfigs: Set<string>,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  if (processedTSConfigs.has(tsConfig)) {
    return;
  }
  processedTSConfigs.add(tsConfig);
  info(`Creating TypeScript(${ts.version}) program with configuration file ${tsConfig}`);
  let program, projectReferences, missingTsConfig;
  try {
    ({ program, projectReferences, missingTsConfig } = createProgram(tsConfig));
  } catch (e) {
    error('Failed to create program: ' + e);
    results.meta.warnings.push(
      `Failed to create TypeScript program with TSConfig file ${tsConfig}. Highest TypeScript supported version is ${ts.version}`,
    );
    return;
  }
  results.compilerOptions.push(program.getCompilerOptions());
  if (missingTsConfig) {
    const msg =
      "At least one referenced/extended tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.";
    warn(msg);
    results.meta.warnings.push(msg);
  }

  await analyzeProgram(
    program,
    files,
    results,
    pendingFiles,
    progressReport,
    incrementalResultsChannel,
  );

  for (const reference of projectReferences) {
    if (isAnalysisCancelled()) {
      return;
    }
    await analyzeFilesFromTsConfig(
      files,
      reference,
      results,
      pendingFiles,
      processedTSConfigs,
      progressReport,
      incrementalResultsChannel,
    );
  }
}

async function analyzeProgram(
  program: ts.Program,
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  progressReport: ProgressReport,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) {
  for (const { fileName } of program.getSourceFiles()) {
    if (isAnalysisCancelled()) {
      return;
    }

    // only analyze files which are requested
    if (files[fileName] && pendingFiles.has(fileName)) {
      progressReport.nextFile(fileName);
      const result = await analyzeFile({
        ...files[fileName],
        program,
        ...fieldsForJsTsAnalysisInput(),
      });
      pendingFiles.delete(fileName);
      handleFileResult(result, fileName, results, incrementalResultsChannel);
    }
  }
}
