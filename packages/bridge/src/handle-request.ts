/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { analyzeCSS } from '../../css/src/analysis/analyzer.js';
import {
  AnalysisInput,
  AnalysisOutput,
  MaybeIncompleteAnalysisInput,
} from '../../shared/src/types/analysis.js';
import { CssAnalysisInput } from '../../css/src/analysis/analysis.js';
import { analyzeHTML } from '../../html/src/index.js';
import { EmbeddedAnalysisInput } from '../../jsts/src/embedded/analysis/analysis.js';
import { analyzeJSTS } from '../../jsts/src/analysis/analyzer.js';
import { JsTsAnalysisInput } from '../../jsts/src/analysis/analysis.js';
import { analyzeProject } from '../../jsts/src/analysis/projectAnalysis/projectAnalyzer.js';
import { ProjectAnalysisInput } from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { analyzeYAML } from '../../yaml/src/index.js';
import { logHeapStatistics } from './memory.js';
import {
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
  writeTSConfigFile,
} from '../../jsts/src/program/program.js';
import { TsConfigJson } from 'type-fest';
import { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import { initializeLinter } from '../../jsts/src/linter/linters.js';
import { clearTypeScriptESLintParserCaches } from '../../jsts/src/parsers/eslint.js';
import { readFile } from '../../shared/src/helpers/files.js';
import { APIError, ErrorCode } from '../../shared/src/errors/error.js';

type RequestResult =
  | {
      type: 'success';
      result: string | AnalysisOutput;
      format?: string;
    }
  | {
      type: 'failure';
      error: ReturnType<typeof serializeError>;
    };

export type RequestType =
  | 'on-analyze-css'
  | 'on-analyze-html'
  | 'on-analyze-js'
  | 'on-analyze-project'
  | 'on-analyze-ts'
  | 'on-analyze-with-program'
  | 'on-analyze-yaml'
  | 'on-create-program'
  | 'on-create-tsconfig-file'
  | 'on-delete-program'
  | 'on-init-linter'
  | 'on-new-tsconfig'
  | 'on-tsconfig-files';

export async function handleRequest(message: any): Promise<RequestResult> {
  try {
    const { type, data } = message as { type: RequestType; data: unknown };
    switch (type) {
      case 'on-analyze-css': {
        const output = await analyzeCSS(
          (await readFileLazily(data as MaybeIncompleteAnalysisInput)) as CssAnalysisInput,
        );
        return { type: 'success', result: JSON.stringify(output) };
      }

      case 'on-analyze-html': {
        const output = await analyzeHTML(
          (await readFileLazily(data as MaybeIncompleteAnalysisInput)) as EmbeddedAnalysisInput,
        );
        return { type: 'success', result: JSON.stringify(output) };
      }

      case 'on-analyze-js': {
        const output = analyzeJSTS(
          (await readFileLazily(data as MaybeIncompleteAnalysisInput)) as JsTsAnalysisInput,
          'js',
        );
        return {
          type: 'success',
          result: output,
          format: output.ast ? 'multipart' : 'json',
        };
      }

      case 'on-analyze-project': {
        const output = await analyzeProject(data as ProjectAnalysisInput);
        return { type: 'success', result: JSON.stringify(output) };
      }

      case 'on-analyze-ts':
      case 'on-analyze-with-program': {
        const output = analyzeJSTS(
          (await readFileLazily(data as MaybeIncompleteAnalysisInput)) as JsTsAnalysisInput,
          'ts',
        );
        return {
          type: 'success',
          result: output,
          format: output.ast ? 'multipart' : 'json',
        };
      }

      case 'on-analyze-yaml': {
        const output = await analyzeYAML(
          (await readFileLazily(data as MaybeIncompleteAnalysisInput)) as EmbeddedAnalysisInput,
        );
        return { type: 'success', result: JSON.stringify(output) };
      }

      case 'on-create-program': {
        const { tsConfig } = data as { tsConfig: string };
        logHeapStatistics();
        const { programId, files, projectReferences, missingTsConfig } =
          createAndSaveProgram(tsConfig);
        return {
          type: 'success',
          result: JSON.stringify({ programId, files, projectReferences, missingTsConfig }),
        };
      }

      case 'on-create-tsconfig-file': {
        const tsConfigContent = data as TsConfigJson;
        const tsConfigFile = await writeTSConfigFile(tsConfigContent);
        return { type: 'success', result: JSON.stringify(tsConfigFile) };
      }

      case 'on-delete-program': {
        const { programId } = data as { programId: string };
        deleteProgram(programId);
        logHeapStatistics();
        return { type: 'success', result: 'OK!' };
      }

      case 'on-init-linter': {
        const { rules, environments, globals, linterId, baseDir } = data as {
          linterId: string;
          environments: string[];
          globals: string[];
          baseDir: string;
          rules: RuleConfig[];
        };
        await initializeLinter(rules, environments, globals, baseDir, linterId);
        return { type: 'success', result: 'OK!' };
      }

      case 'on-new-tsconfig': {
        clearTypeScriptESLintParserCaches();
        return { type: 'success', result: 'OK!' };
      }

      case 'on-tsconfig-files': {
        const { tsconfig } = data as { tsconfig: string };
        const options = createProgramOptions(tsconfig);
        return {
          type: 'success',
          result: JSON.stringify({
            files: options.rootNames,
            projectReferences: options.projectReferences
              ? options.projectReferences.map(ref => ref.path)
              : [],
          }),
        };
      }
    }
  } catch (err) {
    return { type: 'failure', error: serializeError(err) };
  }
}

/**
 * In SonarQube context, an analysis input includes both path and content of a file
 * to analyze. However, in SonarLint, we might only get the file path. As a result,
 * we read the file if the content is missing in the input.
 */
async function readFileLazily(input: MaybeIncompleteAnalysisInput): Promise<AnalysisInput> {
  if (!isCompleteAnalysisInput(input)) {
    return {
      ...input,
      fileContent: await readFile(input.filePath),
    };
  }
  return input;
}

function isCompleteAnalysisInput(input: MaybeIncompleteAnalysisInput): input is AnalysisInput {
  return 'fileContent' in input;
}

/**
 * The default (de)serialization mechanism of the Worker Thread API cannot be used
 * to (de)serialize Error instances. To address this, we turn those instances into
 * regular JavaScript objects.
 */
function serializeError(err: Error) {
  switch (true) {
    case err instanceof APIError:
      return { code: err.code, message: err.message, stack: err.stack, data: err.data };
    case err instanceof Error:
      return { code: ErrorCode.Unexpected, message: err.message, stack: err.stack };
    default:
      return { code: ErrorCode.Unexpected, message: err };
  }
}
