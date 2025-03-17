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
import { createProgramOptions } from '../../program/program.js';
import { analyzeFile } from './analyzeFile.js';
import { clearTypeScriptESLintParserCaches } from '../../parsers/eslint.js';
import { fieldsForJsTsAnalysisInput } from '../../../../shared/src/helpers/configuration.js';

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
        results.files[filename] = await analyzeFile({
          ...files[filename],
          tsConfigs: [tsConfig],
          ...fieldsForJsTsAnalysisInput(),
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
