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
import {
  analyzeProject,
  cancelAnalysis,
} from '../../jsts/src/analysis/projectAnalysis/projectAnalyzer.js';
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

export async function handleRequest(
  request: BridgeRequest,
  workerData: WorkerData,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
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
        const output = await analyzeProject(request.data, incrementalResultsChannel);
        logHeapStatistics(workerData?.debugMemory);
        return { type: 'success', result: output };
      }
      case 'on-cancel-analysis': {
        cancelAnalysis();
        return { type: 'success', result: 'OK' };
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
