/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { DEFAULT_LANGUAGE, JsTsFiles, ProjectAnalysisOutput } from './projectAnalysis.js';
import { createAndSaveProgram, deleteProgram } from '../../program/program.js';
import { analyzeFile } from './analyzeFile.js';
import { error } from '../../../../shared/src/helpers/logging.js';
import { readFile } from '../../../../shared/src/helpers/files.js';

/**
 * Analyzes JavaScript / TypeScript files using TypeScript programs. Only the files
 * belonging to the given tsconfig.json files will be analyzed.
 *
 * @param files the list of JavaScript / TypeScript files to analyze.
 * @param tsConfigs list of tsconfig.json files to use for the analysis
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param pendingFiles array of files which are still not analyzed, to keep track of progress
 *                     and avoid analyzing twice the same file
 */
export async function analyzeWithProgram(
  files: JsTsFiles,
  tsConfigs: AsyncGenerator<string>,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
) {
  for await (const tsConfig of tsConfigs) {
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
      results.files[filename] = analyzeFile({
        filePath: filename,
        fileContent: files[filename].fileContent ?? (await readFile(filename)),
        fileType: files[filename].fileType,
        language: files[filename].language ?? DEFAULT_LANGUAGE,
        programId,
      });
      pendingFiles.delete(filename);
    }
  }
  deleteProgram(programId);

  for (const reference of projectReferences) {
    await analyzeProgram(files, reference, results, pendingFiles);
  }
}
