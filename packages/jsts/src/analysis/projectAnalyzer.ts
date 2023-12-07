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

import { JsTsLanguage, readFile } from '@sonar/shared';
import {
  analyzeJSTS,
  clearTypeScriptESLintParserCaches,
  createAndSaveProgram,
  createProgramOptions,
  initializeLinter,
  JsTsFiles,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
  searchPackageJsonFiles,
} from '@sonar/jsts';

const DEFAULT_LANGUAGE: JsTsLanguage = 'ts';

/**
 * Analyzes a JavaScript / TypeScript project in a single run
 *
 * @param input the JavaScript / TypeScript project to analyze
 * @returns the JavaScript / TypeScript project analysis output
 */
export async function analyzeProject(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  const { rules, environments, globals, baseDir, exclusions = [] } = input;
  const inputFilenames = Object.keys(input.files);
  const pendingFiles: Set<string> = new Set(inputFilenames);
  const watchProgram = input.isSonarlint || hasVueFile(inputFilenames);
  initializeLinter(rules, environments, globals);
  searchPackageJsonFiles(baseDir, exclusions);
  const tsConfigs = input.tsConfigs ?? []; // || searchTsConfigFiles(baseDir, exclusions);
  const results: ProjectAnalysisOutput = { files: {} };
  if (watchProgram) {
    await analyzeWithWatchProgram(tsConfigs, input.files, results, pendingFiles);
  } else {
    await analyzeWithProgram(tsConfigs, input.files, results, pendingFiles);
  }

  await analyzeWithoutProgram(pendingFiles, input.files, results);
  return results;
}

async function analyzeWithProgram(
  tsConfigs: string[],
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
) {
  for (const tsConfig of tsConfigs) {
    const { files: filenames, programId } = createAndSaveProgram(tsConfig);
    for (const filename of filenames) {
      // only analyze files which are requested
      if (files[filename]) {
        results.files[filename] = analyzeJSTS(
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
  }
}

async function analyzeWithWatchProgram(
  tsConfigs: string[],
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
) {
  for (const tsConfig of tsConfigs) {
    const options = createProgramOptions(tsConfig);
    const filenames = options.rootNames;
    tsConfigs.push(
      ...(options.projectReferences ? options.projectReferences.map(ref => ref.path) : []),
    );
    for (const filename of filenames) {
      // only analyze files which are requested
      if (files[filename]) {
        results.files[filename] = analyzeJSTS(
          {
            filePath: filename,
            fileContent: files[filename].fileContent ?? (await readFile(filename)),
            fileType: files[filename].fileType,
            tsConfigs: [tsConfig],
          },
          files[filename].language ?? DEFAULT_LANGUAGE,
        );
        pendingFiles.delete(filename);
      }
    }
    clearTypeScriptESLintParserCaches();
  }
}

async function analyzeWithoutProgram(
  filenames: Set<string>,
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
) {
  for (const filename of filenames) {
    results.files[filename] = analyzeJSTS(
      {
        filePath: filename,
        fileContent: files[filename].fileContent ?? (await readFile(filename)),
        fileType: files[filename].fileType,
      },
      files[filename].language ?? DEFAULT_LANGUAGE,
    );
  }
}
function hasVueFile(files: string[]) {
  return files.some(file => file.toLowerCase().endsWith('.vue'));
}
