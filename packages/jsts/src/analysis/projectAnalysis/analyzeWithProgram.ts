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
  createAndSaveProgram,
  DEFAULT_LANGUAGE,
  deleteProgram,
  JsTsFiles,
  ProjectAnalysisOutput,
} from '../../';
import { readFile } from '@sonar/shared';

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
  const { files: filenames, programId, projectReferences } = createAndSaveProgram(tsConfig);
  results.meta?.programsCreated.push(tsConfig);
  for (const filename of filenames) {
    // only analyze files which are requested
    if (files[filename]) {
      results.files[filename] = analyzeFile(
        {
          filePath: filename,
          fileContent: files[filename].fileContent ?? (await readFile(filename)),
          fileType: files[filename].fileType,
          programId,
        },
        files[filename].language ?? DEFAULT_LANGUAGE,
      );
      pendingFiles.delete(filename);
    }
  }
  deleteProgram(programId);
  //Analyze references as well
  for (const reference of projectReferences) {
    await analyzeProgram(files, reference, results, pendingFiles);
  }
}
