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
import { APIError, debug, getContext, JsTsLanguage, readFile } from '@sonar/shared';
import { SourceCode } from 'eslint';
import {
  computeMetrics,
  findNoSonarLines,
  getCpdTokens,
  getLinter,
  getSyntaxHighlighting,
  initializeLinter,
  LinterWrapper,
  SymbolHighlight,
} from '../linter';
import { buildSourceCode } from '../builders';
import { measureDuration } from '../monitoring';
import {
  JsTsAnalysisInput,
  JsTsAnalysisOutput,
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
} from './analysis';
import { searchPackageJsonFiles } from '../dependencies';
import { createAndSaveProgram, createProgramOptions } from '../program';
import { clearTypeScriptESLintParserCaches } from '../parsers';

const DEFAULT_LANGUAGE: JsTsLanguage = 'ts';

export async function analyzeProject(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  const { rules, environments, globals, baseDir, exclusions = [] } = input;
  const inputFilenames = Object.keys(input.files);
  const watchProgram = input.isSonarlint || hasVueFile(inputFilenames);
  const pendingFiles: Set<string> = new Set(inputFilenames);
  initializeLinter(rules, environments, globals);
  searchPackageJsonFiles(baseDir, exclusions);
  const tsConfigs = input.tsConfigs ?? []; // || searchTsConfigFiles(baseDir, exclusions);
  const results: ProjectAnalysisOutput = { files: {} };
  for (const tsConfig of tsConfigs) {
    if (watchProgram) {
      const options = createProgramOptions(tsConfig);
      const files = options.rootNames;
      tsConfigs.push(
        ...(options.projectReferences ? options.projectReferences.map(ref => ref.path) : []),
      );
      for (const file of files) {
        // only analyze files which are requested
        if (input.files[file]) {
          results.files[file] = analyzeJSTS(
            {
              filePath: file,
              fileContent: input.files[file].fileContent ?? (await readFile(file)),
              fileType: input.files[file].fileType,
              tsConfigs: [tsConfig],
            },
            input.files[file].language ?? DEFAULT_LANGUAGE,
          );
          pendingFiles.delete(file);
        }
      }
      clearTypeScriptESLintParserCaches();
    } else {
      const { files, programId } = createAndSaveProgram(tsConfig);
      for (const file of files) {
        // only analyze files which are requested
        if (input.files[file]) {
          results.files[file] = analyzeJSTS(
            {
              filePath: file,
              fileContent: input.files[file].fileContent ?? (await readFile(file)),
              fileType: input.files[file].fileType,
              programId,
            },
            input.files[file].language ?? DEFAULT_LANGUAGE,
          );
          pendingFiles.delete(file);
        }
      }
    }
  }

  for (const file of pendingFiles) {
    results.files[file] = analyzeJSTS(
      {
        filePath: file,
        fileContent: input.files[file].fileContent ?? (await readFile(file)),
        fileType: input.files[file].fileType,
      },
      input.files[file].language ?? DEFAULT_LANGUAGE,
    );
  }
  return results;
}

/**
 * Analyzes a JavaScript / TypeScript analysis input
 *
 * Analyzing a JavaScript / TypeScript analysis input implies building
 * an ESLint SourceCode instance, meaning parsing the actual code to get
 * an abstract syntax tree to operate on. Any parsing error is returned
 * immediately. Otherwise, the analysis proceeds with the actual linting
 * of the source code. The linting result is returned along with some
 * analysis performance data.
 *
 * The analysis requires that global linter wrapper is initialized.
 *
 * @param input the JavaScript / TypeScript analysis input to analyze
 * @param language the language of the analysis input
 * @returns the JavaScript / TypeScript analysis output
 */
export function analyzeJSTS(input: JsTsAnalysisInput, language: JsTsLanguage): JsTsAnalysisOutput {
  debug(`Analyzing file "${input.filePath}" with linterId "${input.linterId}"`);
  const linter = getLinter(input.linterId);
  const building = () => buildSourceCode(input, language);
  const { result: built, duration: parseTime } = measureDuration(building);
  const analysis = () => analyzeFile(linter, input, built);
  const { result: output, duration: analysisTime } = measureDuration(analysis);
  return { ...output, perf: { parseTime, analysisTime } };
}

/**
 * Analyzes a parsed ESLint SourceCode instance
 *
 * Analyzing a parsed ESLint SourceCode instance consists in linting the source code
 * and computing extended metrics about the code. At this point, the linting results
 * are already SonarQube-compatible and can be consumed back as such by the sensor.
 *
 * @param linter the linter to use for the analysis
 * @param input the JavaScript / TypeScript analysis input to analyze
 * @param sourceCode the corresponding parsed ESLint SourceCode instance
 * @returns the JavaScript / TypeScript analysis output
 */
function analyzeFile(
  linter: LinterWrapper,
  input: JsTsAnalysisInput,
  sourceCode: SourceCode,
): JsTsAnalysisOutput {
  try {
    const { filePath, fileType, language } = input;
    const { issues, highlightedSymbols, cognitiveComplexity, ucfgPaths } = linter.lint(
      sourceCode,
      filePath,
      fileType,
      language,
    );
    const extendedMetrics = computeExtendedMetrics(
      input,
      sourceCode,
      highlightedSymbols,
      cognitiveComplexity,
    );
    return { issues, ucfgPaths, ...extendedMetrics };
  } catch (e) {
    /** Turns exceptions from TypeScript compiler into "parsing" errors */
    if (e.stack.indexOf('typescript.js:') > -1) {
      throw APIError.failingTypeScriptError(e.message);
    } else {
      throw e;
    }
  }
}

/**
 * Computes extended metrics about the analyzed code
 *
 * Computed extended metrics may differ depending on the analysis context:
 *
 * - SonarLint doesn't care about code metrics except for `NOSONAR` comments
 * - All kinds of metrics are considered for main files.
 * - Symbol highlighting, syntax highlighting and `NOSONAR` comments are only consider
 *   for test files.
 *
 * @param input the JavaScript / TypeScript analysis input to analyze
 * @param sourceCode the analyzed ESLint SourceCode instance
 * @param highlightedSymbols the computed symbol highlighting of the code
 * @param cognitiveComplexity the computed cognitive complexity of the code
 * @returns the extended metrics of the code
 */
function computeExtendedMetrics(
  input: JsTsAnalysisInput,
  sourceCode: SourceCode,
  highlightedSymbols: SymbolHighlight[],
  cognitiveComplexity?: number,
) {
  if (getContext().sonarlint) {
    return { metrics: findNoSonarLines(sourceCode) };
  }
  const { fileType, ignoreHeaderComments } = input;
  if (fileType === 'MAIN') {
    return {
      highlightedSymbols,
      highlights: getSyntaxHighlighting(sourceCode).highlights,
      metrics: computeMetrics(sourceCode, !!ignoreHeaderComments, cognitiveComplexity),
      cpdTokens: getCpdTokens(sourceCode).cpdTokens,
    };
  } else {
    return {
      highlightedSymbols,
      highlights: getSyntaxHighlighting(sourceCode).highlights,
      metrics: findNoSonarLines(sourceCode),
    };
  }
}

function hasVueFile(files: string[]) {
  return files.some(file => file.toLowerCase().endsWith('.vue'));
}
