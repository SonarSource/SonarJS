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
import { JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { createAndSaveProgram, deleteProgram } from '../../program/program.js';
import { analyzeFile } from './analyzeFile.js';
import { error } from '../../../../shared/src/helpers/logging.js';
import { fieldsForJsTsAnalysisInput } from '../../../../shared/src/helpers/configuration.js';
import { getTsConfigs } from './tsconfigs.js';

/**
 * Analyzes JavaScript / TypeScript files using TypeScript programs. Files not
 * included in any tsconfig from the cache will not be analyzed
 *
 * @param files the list of JavaScript / TypeScript files to analyze.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param pendingFiles array of files which are still not analyzed, to keep track of progress
 *                     and avoid analyzing twice the same file
 */
export async function analyzeWithProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
) {
  for (const tsConfig of getTsConfigs()) {
    await analyzeProgram(files, tsConfig, results, pendingFiles);
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
) {
  let filenames, programId, projectReferences;
  try {
    ({ files: filenames, programId, projectReferences } = createAndSaveProgram(tsConfig));
  } catch (e) {
    error('Failed to create program: ' + e);
    return;
  }
  results.meta?.programsCreated.push(tsConfig);
  for (const filename of filenames) {
    // only analyze files which are requested
    if (files[filename] && pendingFiles.has(filename)) {
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
    await analyzeProgram(files, reference, results, pendingFiles);
  }
}
