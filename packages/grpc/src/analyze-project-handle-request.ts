/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { logHeapStatistics } from './analyze-project-memory.js';
import {
  type AnalyzeProjectIncrementalEvent,
  type AnalyzeProjectResponse,
  type AnalyzeProjectRuntimeRequest,
  type RequestResult,
  serializeError,
} from './analyze-project-request.js';
import {
  InvalidAnalyzeProjectRequestError,
  normalizeAnalyzeProjectRequest,
} from './analyze-project-normalize.js';

export type WorkerData = {
  debugMemory: boolean;
};

export async function handleAnalyzeProjectRequest(
  request: AnalyzeProjectRuntimeRequest,
  workerData: WorkerData,
  incrementalResultsChannel?: (result: AnalyzeProjectIncrementalEvent) => void,
): Promise<RequestResult<AnalyzeProjectResponse | void>> {
  try {
    switch (request.type) {
      case 'on-analyze-project': {
        logHeapStatistics(workerData?.debugMemory);
        const sanitizedInput = await normalizeAnalyzeProjectRequest(request.data);
        const wrappedIncrementalResultsChannel = incrementalResultsChannel
          ? (event: AnalyzeProjectIncrementalEvent['event']) =>
              incrementalResultsChannel({
                event,
                pathMap: sanitizedInput.pathMap,
              })
          : undefined;

        const output = await analyzeProject(
          {
            rules: sanitizedInput.rules,
            cssRules: sanitizedInput.cssRules,
            bundles: sanitizedInput.bundles,
            rulesWorkdir: sanitizedInput.rulesWorkdir,
          },
          sanitizedInput.configuration,
          wrappedIncrementalResultsChannel,
        );
        logHeapStatistics(workerData?.debugMemory);
        return {
          type: 'success',
          result: {
            output,
            pathMap: sanitizedInput.pathMap,
          },
        };
      }
      case 'on-cancel-analysis': {
        cancelAnalysis();
        // This internal request only acknowledges that the cancel signal was delivered.
        // The public CancelAnalysis RPC computes the outward-facing { cancelled } response.
        return { type: 'success', result: undefined };
      }
      default: {
        // Handle unknown request types
        const unknownType = (request as { type: unknown }).type;
        return {
          type: 'failure',
          error: serializeError(new Error(`Unknown request type: ${unknownType}`)),
          reason: 'runtime',
        };
      }
    }
  } catch (err) {
    return {
      type: 'failure',
      error: serializeError(err),
      reason: err instanceof InvalidAnalyzeProjectRequestError ? 'invalid_request' : 'runtime',
    };
  }
}
