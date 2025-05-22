/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { createAndSaveProgram, deleteProgram } from '../../program/program.js';
import { analyzeFile } from './analyzeFile.js';
import { error, info, warn } from '../../../../shared/src/helpers/logging.js';
import { fieldsForJsTsAnalysisInput } from '../../../../shared/src/helpers/configuration.js';
import { tsConfigStore } from './file-stores/index.js';
import ts from 'typescript';
import { ProgressReport } from '../../../../shared/src/helpers/progress-report.js';
/**
 * Analyzes JavaScript / TypeScript files using TypeScript programs. Files not
 * included in any tsconfig from the cache will not be analyzed.
 *
 * @param files the list of JavaScript / TypeScript files to analyze.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param pendingFiles array of files which are still not analyzed, to keep track of progress
 *                     and avoid analyzing twice the same file
 * @param progressReport progress report to log analyzed files
 */
export async function analyzeWithProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  progressReport: ProgressReport,
) {
  const processedTSConfigs: Set<string> = new Set();
  for (const tsConfig of tsConfigStore.getTsConfigs()) {
    await analyzeProgram(
      files,
      tsConfig,
      results,
      pendingFiles,
      processedTSConfigs,
      progressReport,
    );
    if (!pendingFiles.size) {
      break;
    }
  }
}

async function analyzeProgram(
  files: JsTsFiles,
  tsConfig: string,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
  processedTSConfigs: Set<string>,
  progressReport: ProgressReport,
) {
  if (processedTSConfigs.has(tsConfig)) {
    return;
  }
  processedTSConfigs.add(tsConfig);
  info('Creating TypeScript program');
  info(`TypeScript(${ts.version}) configuration file ${tsConfig}`);
  let filenames, programId, projectReferences, missingTsConfig;
  try {
    ({
      files: filenames,
      programId,
      projectReferences,
      missingTsConfig,
    } = createAndSaveProgram(tsConfig));
  } catch (e) {
    error('Failed to create program: ' + e);
    results.meta.warnings.push(
      `Failed to create TypeScript program with TSConfig file ${tsConfig}. Highest TypeScript supported version is ${ts.version}`,
    );
    return;
  }
  if (missingTsConfig) {
    const msg =
      "At least one tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.";
    warn(msg);
    results.meta.warnings.push(msg);
  }
  results.meta?.programsCreated.push(tsConfig);
  for (const filename of filenames) {
    // only analyze files which are requested
    if (files[filename] && pendingFiles.has(filename)) {
      progressReport.nextFile(filename);
      results.files[filename] = await analyzeFile({
        ...files[filename],
        programId,
        ...fieldsForJsTsAnalysisInput(),
      });
      pendingFiles.delete(filename);
    }
  }
  deleteProgram(programId);

  for (const reference of projectReferences) {
    await analyzeProgram(
      files,
      reference,
      results,
      pendingFiles,
      processedTSConfigs,
      progressReport,
    );
  }
}
