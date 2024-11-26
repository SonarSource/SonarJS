/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { analyzeCSS } from '../../css/src/analysis/analyzer.js';
import { analyzeHTML } from '../../html/src/index.js';
import { analyzeJSTS } from '../../jsts/src/analysis/analyzer.js';
import { analyzeProject } from '../../jsts/src/analysis/projectAnalysis/projectAnalyzer.js';
import { analyzeYAML } from '../../yaml/src/index.js';
import { logHeapStatistics } from './memory.js';
import {
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
  writeTSConfigFile,
} from '../../jsts/src/program/program.js';
import { initializeLinter } from '../../jsts/src/linter/linters.js';
import { clearTypeScriptESLintParserCaches } from '../../jsts/src/parsers/eslint.js';
import { BridgeRequest, readFileLazily, RequestResult, serializeError } from './request.js';

export async function handleRequest(request: BridgeRequest): Promise<RequestResult> {
  try {
    switch (request.type) {
      case 'on-init-linter': {
        const { rules, environments, globals, linterId, baseDir } = request.data;
        await initializeLinter(rules, environments, globals, baseDir, linterId);
        return { type: 'success', result: 'OK!' };
      }
      case 'on-analyze-js': {
        const output = analyzeJSTS(await readFileLazily(request.data), 'js');
        return {
          type: 'success',
          result: output,
        };
      }
      case 'on-analyze-ts':
      case 'on-analyze-with-program': {
        const output = analyzeJSTS(await readFileLazily(request.data), 'ts');
        return {
          type: 'success',
          result: output,
        };
      }
      case 'on-create-program': {
        logHeapStatistics();
        const { programId, files, projectReferences, missingTsConfig } = createAndSaveProgram(
          request.data.tsConfig,
        );
        return {
          type: 'success',
          result: { programId, files, projectReferences, missingTsConfig },
        };
      }
      case 'on-delete-program': {
        deleteProgram(request.data.programId);
        logHeapStatistics();
        return { type: 'success', result: 'OK!' };
      }
      case 'on-create-tsconfig-file': {
        const tsConfigContent = request.data;
        const tsConfigFile = await writeTSConfigFile(tsConfigContent);
        return { type: 'success', result: tsConfigFile };
      }
      // Clean typescript-eslint cache in SonarLint. not used currently
      case 'on-new-tsconfig': {
        clearTypeScriptESLintParserCaches();
        return { type: 'success', result: 'OK!' };
      }
      case 'on-tsconfig-files': {
        const options = createProgramOptions(request.data.tsConfig);
        return {
          type: 'success',
          result: {
            files: options.rootNames,
            projectReferences: options.projectReferences
              ? options.projectReferences.map(ref => ref.path)
              : [],
          },
        };
      }
      case 'on-analyze-css': {
        const output = await analyzeCSS(await readFileLazily(request.data));
        return { type: 'success', result: output };
      }
      case 'on-analyze-yaml': {
        const output = await analyzeYAML(await readFileLazily(request.data));
        return { type: 'success', result: output };
      }

      case 'on-analyze-html': {
        const output = await analyzeHTML(await readFileLazily(request.data));
        return { type: 'success', result: output };
      }
      case 'on-analyze-project': {
        const output = await analyzeProject(request.data);
        return { type: 'success', result: output };
      }
    }
  } catch (err) {
    return { type: 'failure', error: serializeError(err) };
  }
}
