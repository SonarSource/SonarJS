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
  JsTsAnalysisOutput,
  JsTsFiles,
} from '../../';
import { error, readFile } from '@sonar/shared';

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
export async function analyzeWithProgram(files: JsTsFiles, tsConfigs: AsyncGenerator<string>) {
  const resultFiles: { [key: string]: JsTsAnalysisOutput } = {};
  const pendingFiles = new Set(Object.keys(files));
  const programsCreated: string[] = [];
  for await (const tsConfig of tsConfigs) {
    const intermediateResult = await analyzeProgram(files, tsConfig, pendingFiles);
    Object.assign(resultFiles, intermediateResult.resultFiles);
    programsCreated.push(...intermediateResult.programsCreated);
    if (!pendingFiles.size) {
      break;
    }
  }
  return { resultFiles, programsCreated };
}

async function analyzeProgram(
  files: JsTsFiles,
  tsConfig: string,
  pendingFiles: Set<string>,
  programsCreated: string[] = [],
) {
  let filenames, programId, projectReferences;
  try {
    ({ files: filenames, programId, projectReferences } = createAndSaveProgram(tsConfig));
  } catch (e) {
    error('Failed to create program: ' + e);
    return { resultFiles: {}, programsCreated: [] };
  }
  programsCreated.push(tsConfig);
  const resultFiles: { [key: string]: JsTsAnalysisOutput } = {};
  for (const filename of filenames) {
    // only analyze files which are requested
    if (files[filename]) {
      resultFiles[filename] = analyzeFile({
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
    const { resultFiles: referenceResults, programsCreated: referencePC } = await analyzeProgram(
      files,
      reference,
      pendingFiles,
    );
    Object.assign(resultFiles, referenceResults);
    programsCreated = programsCreated.concat(referencePC);
  }
  return { resultFiles, programsCreated };
}
