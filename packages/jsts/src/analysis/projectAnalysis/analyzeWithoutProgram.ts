/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { analyzeFile, DEFAULT_LANGUAGE, JsTsFiles, ProjectAnalysisOutput } from '../../';
import { readFile } from '@sonar/shared';

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
    results.files[filename] = analyzeFile(
      {
        filePath: filename,
        fileContent: files[filename].fileContent ?? (await readFile(filename)),
        fileType: files[filename].fileType,
      },
      files[filename].language ?? DEFAULT_LANGUAGE,
    );
  }
}
