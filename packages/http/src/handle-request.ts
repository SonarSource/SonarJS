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
import { analyzeProject, cancelAnalysis } from '../../analysis/src/analyzeProject.js';
import { logHeapStatistics } from './memory.js';
import {
  type BridgeRequest,
  type RequestResult,
  serializeError,
  type WsIncrementalResult,
} from './request.js';
import type { WorkerData } from './worker/create-worker.js';
import { sanitizeProjectAnalysisInput } from '../../analysis/src/common/input-sanitize.js';

export async function handleRequest(
  request: BridgeRequest,
  workerData: WorkerData,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
): Promise<RequestResult> {
  try {
    switch (request.type) {
      case 'on-analyze-project': {
        logHeapStatistics(workerData?.debugMemory);
        // sanitizeProjectAnalysisInput initializes file stores internally
        const sanitizedInput = await sanitizeProjectAnalysisInput(request.data);

        const output = await analyzeProject(
          {
            rules: sanitizedInput.rules,
            cssRules: sanitizedInput.cssRules,
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
