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
import {
  analyzeFile,
  clearTypeScriptESLintParserCaches,
  createProgramOptions,
  DEFAULT_LANGUAGE,
  JsTsFiles,
  ProjectAnalysisOutput,
} from '../../';
import { readFile } from '@sonar/shared';

/**
 * Analyzes JavaScript / TypeScript files using TypeScript watchPrograms. Only the files
 * belonging to the given tsconfig.json files will be analyzed. We rely on the
 * typescript-eslint programCreation for this.
 *
 * @param files the list of JavaScript / TypeScript files to analyze.
 * @param tsConfigs list of tsconfig.json files to use for the analysis
 * @param results ProjectAnalysisOutput object where the analysis results are stored
 * @param pendingFiles array of files which are still not analyzed, to keep track of progress
 *                     and avoid analyzing twice the same file
 */
export async function analyzeWithWatchProgram(
  files: JsTsFiles,
  tsConfigs: AsyncGenerator<string>,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
) {
  for await (const tsConfig of tsConfigs) {
    const options = createProgramOptions(tsConfig);
    const filenames = options.rootNames;
    for (const filename of filenames) {
      // only analyze files which are requested
      if (files[filename] && pendingFiles.has(filename)) {
        results.files[filename] = analyzeFile({
          filePath: filename,
          fileContent: files[filename].fileContent ?? (await readFile(filename)),
          fileType: files[filename].fileType,
          language: files[filename].language ?? DEFAULT_LANGUAGE,
          tsConfigs: [tsConfig],
        });
        pendingFiles.delete(filename);
      }
    }
    clearTypeScriptESLintParserCaches();
    if (!pendingFiles.size) {
      break;
    }
  }
}
