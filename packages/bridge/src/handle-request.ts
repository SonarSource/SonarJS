/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import {
  analyzeProject,
  cancelAnalysis,
} from '../../jsts/src/analysis/projectAnalysis/analyzeProject.js';
import { analyzeYAML } from '../../yaml/src/index.js';
import { logHeapStatistics } from './memory.js';
import { Linter } from '../../jsts/src/linter/linter.js';
import {
  type BridgeRequest,
  type RequestResult,
  serializeError,
  type WsIncrementalResult,
} from './request.js';
import type { WorkerData } from '../../shared/src/helpers/worker.js';
import { getFilesToAnalyze } from '../../jsts/src/analysis/projectAnalysis/file-stores/index.js';
import type { RawInputFiles } from '../../jsts/src/analysis/projectAnalysis/file-stores/store-type.js';
import {
  sanitizeAnalysisInput,
  sanitizeJsTsAnalysisInput,
  sanitizeCssAnalysisInput,
  sanitizeInitLinterInput,
  sanitizeProjectAnalysisInput,
} from '../../shared/src/helpers/sanitize.js';
import { getShouldIgnoreParams } from '../../shared/src/helpers/configuration.js';

export async function handleRequest(
  request: BridgeRequest,
  workerData: WorkerData,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
): Promise<RequestResult> {
  try {
    switch (request.type) {
      case 'on-init-linter': {
        const sanitizedInput = sanitizeInitLinterInput(request.data);
        await Linter.initialize(sanitizedInput);
        return { type: 'success', result: 'OK' };
      }
      case 'on-analyze-jsts': {
        const { input, configuration } = await sanitizeJsTsAnalysisInput(request.data);
        const output = await analyzeJSTS(input, getShouldIgnoreParams(configuration));
        return { type: 'success', result: output };
      }
      case 'on-analyze-css': {
        const { input, configuration } = await sanitizeCssAnalysisInput(request.data);
        const output = await analyzeCSS(input, getShouldIgnoreParams(configuration));
        return { type: 'success', result: output };
      }
      case 'on-analyze-yaml': {
        const { input, configuration } = await sanitizeAnalysisInput(request.data);
        const output = await analyzeYAML(input, getShouldIgnoreParams(configuration));
        return { type: 'success', result: output };
      }
      case 'on-analyze-html': {
        const { input, configuration } = await sanitizeAnalysisInput(request.data);
        const output = await analyzeHTML(input, getShouldIgnoreParams(configuration));
        return { type: 'success', result: output };
      }
      case 'on-analyze-project': {
        logHeapStatistics(workerData?.debugMemory);
        const sanitizedInput = sanitizeProjectAnalysisInput(request.data);

        // Get sanitized files via file store
        const { filesToAnalyze, pendingFiles } = await getFilesToAnalyze(
          sanitizedInput.configuration,
          sanitizedInput.rawFiles as RawInputFiles | undefined,
        );

        const output = await analyzeProject(
          {
            filesToAnalyze,
            pendingFiles,
            rules: sanitizedInput.rules,
            bundles: sanitizedInput.bundles,
            rulesWorkdir: sanitizedInput.rulesWorkdir,
          },
          sanitizedInput.configuration,
          incrementalResultsChannel,
        );
        logHeapStatistics(workerData?.debugMemory);
        return { type: 'success', result: output };
      }
      case 'on-cancel-analysis': {
        cancelAnalysis();
        return { type: 'success', result: 'OK' };
      }
      default: {
        // Handle unknown request types (e.g., from malformed WebSocket messages)
        const unknownType = (request as { type: unknown }).type;
        return {
          type: 'failure',
          error: serializeError(new Error(`Unknown request type: ${unknownType}`)),
        };
      }
    }
  } catch (err) {
    if (incrementalResultsChannel) {
      incrementalResultsChannel({
        messageType: 'error',
        error: serializeError(err),
      });
    }
    return { type: 'failure', error: serializeError(err) };
  }
}
