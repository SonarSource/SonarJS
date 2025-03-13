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
import {
  Configuration,
  fieldsForJsTsAnalysisInput,
  JsTsFiles,
  ProjectAnalysisOutput,
} from './projectAnalysis.js';
import { analyzeFile } from './analyzeFile.js';

/**
 * Analyzes files without type-checking.
 *
 * @param filenames the list of files to analyze.
 * @param files the list of files objects containing the files input data.
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param configuration object containing configuration for the analysis with fields needed for
 *                      analyzing each file, i.e. allowTsParserJsFiles
 */
export async function analyzeWithoutProgram(
  filenames: Set<string>,
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  configuration: Configuration,
) {
  for (const filename of filenames) {
    results.meta?.filesWithoutTypeChecking.push(filename);
    results.files[filename] = await analyzeFile({
      ...files[filename],
      ...fieldsForJsTsAnalysisInput(configuration),
    });
  }
}
