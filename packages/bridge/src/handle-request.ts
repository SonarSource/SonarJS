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
import { analyzeCSS } from '../../css/src/analysis/analyzer.js';
import { analyzeHTML } from '../../html/src/index.js';
import { analyzeJSTS, getTelemetry } from '../../jsts/src/analysis/analyzer.js';
import { analyzeProject } from '../../jsts/src/analysis/projectAnalysis/projectAnalyzer.js';
import { tsConfigStore } from '../../jsts/src/analysis/projectAnalysis/file-stores/index.js';
import { analyzeYAML } from '../../yaml/src/index.js';
import { logHeapStatistics } from './memory.js';
import {
  createAndSaveProgram,
  createProgramOptions,
  deleteProgram,
} from '../../jsts/src/program/program.js';
import { Linter } from '../../jsts/src/linter/linter.js';
import { clearTypeScriptESLintParserCaches } from '../../jsts/src/parsers/eslint.js';
import { BridgeRequest, RequestResult, serializeError } from './request.js';
import { WorkerData } from '../../shared/src/helpers/worker.js';

export async function handleRequest(
  request: BridgeRequest,
  workerData: WorkerData,
): Promise<RequestResult> {
  try {
    switch (request.type) {
      case 'on-init-linter': {
        await Linter.initialize(request.data);
        return { type: 'success', result: 'OK' };
      }
      case 'on-analyze-jsts': {
        const output = await analyzeJSTS(request.data);
        return {
          type: 'success',
          result: output,
        };
      }
      case 'on-create-program': {
        logHeapStatistics(workerData?.debugMemory);
        const { programId, files, projectReferences, missingTsConfig } = createAndSaveProgram(
          request.data.tsConfig,
        );
        logHeapStatistics(workerData?.debugMemory);
        return {
          type: 'success',
          result: { programId, files, projectReferences, missingTsConfig },
        };
      }
      case 'on-delete-program': {
        deleteProgram(request.data.programId);
        logHeapStatistics(workerData?.debugMemory);
        return { type: 'success', result: 'OK' };
      }
      case 'on-create-tsconfig-file': {
        const tsConfigContent = request.data;
        const tsConfigFile = await tsConfigStore.writeTSConfigFile(tsConfigContent);
        return { type: 'success', result: tsConfigFile };
      }
      // Clean typescript-eslint cache in SonarLint. not used currently
      case 'on-new-tsconfig': {
        clearTypeScriptESLintParserCaches();
        return { type: 'success', result: 'OK' };
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
        const output = await analyzeCSS(request.data);
        return { type: 'success', result: output };
      }
      case 'on-analyze-yaml': {
        const output = await analyzeYAML(request.data);
        return { type: 'success', result: output };
      }

      case 'on-analyze-html': {
        const output = await analyzeHTML(request.data);
        return { type: 'success', result: output };
      }
      case 'on-analyze-project': {
        logHeapStatistics(workerData?.debugMemory);
        const output = await analyzeProject(request.data);
        logHeapStatistics(workerData?.debugMemory);
        return { type: 'success', result: output };
      }
      case 'on-get-telemetry': {
        const output = getTelemetry();
        return { type: 'success', result: output };
      }
    }
  } catch (err) {
    return { type: 'failure', error: serializeError(err) };
  }
}
