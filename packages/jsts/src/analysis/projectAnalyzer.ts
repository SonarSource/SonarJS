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

import { File, FileFinder, JsTsLanguage, readFile } from '@sonar/shared';
import {
  analyzeJSTS,
  clearTypeScriptESLintParserCaches,
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
  initializeLinter,
  JsTsAnalysisInput,
  JsTsAnalysisOutput,
  JsTsFiles,
  loopTSConfigs,
  PACKAGE_JSON,
  PACKAGE_JSON_PARSER,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
  setPackageJsons,
  setTSConfigJsons,
  TSCONFIG_JSON,
} from '@sonar/jsts';
import { EMPTY_JSTS_ANALYSIS_OUTPUT } from '../../../bridge/src/errors';
import { PackageJson } from 'type-fest';

const DEFAULT_LANGUAGE: JsTsLanguage = 'ts';

function searchTSConfigJsonAndPackageJsonFiles(baseDir: string, exclusions: string[]) {
  const result = FileFinder.searchFiles(
    baseDir,
    [{ pattern: PACKAGE_JSON, parser: PACKAGE_JSON_PARSER }, TSCONFIG_JSON],
    exclusions,
  );
  if (result?.[PACKAGE_JSON]) {
    setPackageJsons(result?.[PACKAGE_JSON] as Map<string, File<PackageJson>[]>);
  }
  if (result?.[TSCONFIG_JSON]) {
    setTSConfigJsons(result?.[TSCONFIG_JSON] as Map<string, File<void>[]>);
  }
}

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
  searchTSConfigJsonAndPackageJsonFiles(baseDir, exclusions);
  const results: ProjectAnalysisOutput = {
    files: {},
    meta: {
      withProgram: false,
      withWatchProgram: false,
      filesWithoutTypeChecking: [],
      programsCreated: [],
    },
  };
  if (watchProgram) {
    results.meta!.withWatchProgram = true;
    await analyzeWithWatchProgram(input.files, results, pendingFiles);
  } else {
    results.meta!.withProgram = true;
    await analyzeWithProgram(input.files, results, pendingFiles);
  }

  await analyzeWithoutProgram(pendingFiles, input.files, results);
  return results;
}

async function analyzeWithProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
) {
  for (const tsConfig of loopTSConfigs()) {
    const { files: filenames, programId } = createAndSaveProgram(tsConfig);
    results.meta!.programsCreated.push(tsConfig);
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
    if (!pendingFiles.size) {
      break;
    }
  }
}

async function analyzeWithWatchProgram(
  files: JsTsFiles,
  results: ProjectAnalysisOutput,
  pendingFiles: Set<string>,
) {
  for (const tsConfig of loopTSConfigs()) {
    const options = createProgramOptions(tsConfig);
    const filenames = options.rootNames;
    for (const filename of filenames) {
      // only analyze files which are requested
      if (files[filename]) {
        results.files[filename] = analyzeFile(
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
    if (!pendingFiles.size) {
      break;
    }
  }
}

async function analyzeWithoutProgram(
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

function analyzeFile(input: JsTsAnalysisInput, language: JsTsLanguage) {
  try {
    return analyzeJSTS(input, language);
  } catch (e) {
    return {
      parsingError: {
        message: e.message,
        code: e.code,
        line: e.data?.line,
      },
      ...EMPTY_JSTS_ANALYSIS_OUTPUT,
    } as JsTsAnalysisOutput;
  }
}

function hasVueFile(files: string[]) {
  return files.some(file => file.toLowerCase().endsWith('.vue'));
}
