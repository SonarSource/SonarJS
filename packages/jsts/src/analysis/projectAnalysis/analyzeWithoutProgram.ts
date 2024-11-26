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
import { analyzeFile } from './analyzeFile.js';
import { readFile } from '../../../../shared/src/helpers/files.js';

/**
 * Analyzes JavaScript / TypeScript files without type-checking.
 *
 * @param filenames the list of JavaScript / TypeScript files to analyze.
 * @param files the list of JavaScript / TypeScript files objects containing the files input data.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 */
export async function analyzeWithoutProgram(
  filenames: Set<string>,
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
) {
  for (const filename of filenames) {
    results.meta?.filesWithoutTypeChecking.push(filename);
    results.files[filename] = analyzeFile({
      filePath: filename,
      fileContent: files[filename].fileContent ?? (await readFile(filename)),
      fileType: files[filename].fileType,
      language: files[filename].language ?? DEFAULT_LANGUAGE,
    });
  }
}
