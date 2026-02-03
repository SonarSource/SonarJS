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
import { setGlobalConfiguration, getBaseDir } from '../../shared/src/helpers/configuration.js';
import { getFilesToAnalyze } from '../../jsts/src/analysis/projectAnalysis/file-stores/index.js';
import type { RawInputFiles } from '../../jsts/src/analysis/projectAnalysis/file-stores/store-type.js';
import { normalizeToAbsolutePath, dirnamePath } from '../../shared/src/helpers/files.js';
import {
  sanitizeAnalysisInput,
  sanitizeJsTsAnalysisInput,
  sanitizeCssAnalysisInput,
  sanitizeInitLinterInput,
  sanitizeProjectAnalysisInput,
} from '../../shared/src/helpers/sanitize.js';
import type { NormalizedAbsolutePath } from '../../shared/src/helpers/files.js';

/**
 * Resolves the base directory for single-file analysis and sets global configuration.
 * Uses provided configuration if available, otherwise derives baseDir from the file path.
 * When no configuration is provided, the default configuration is used (already initialized).
 */
function resolveBaseDir(filePath: string, configuration?: unknown): NormalizedAbsolutePath {
  if (configuration) {
    setGlobalConfiguration(configuration);
    return getBaseDir();
  }
  // Fallback for standalone usage: derive baseDir from filePath
  // Default configuration is already initialized with sensible defaults
  return dirnamePath(normalizeToAbsolutePath(filePath));
}

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
        const data = request.data as Record<string, unknown>;
        const baseDir = resolveBaseDir(data.filePath as string, data.configuration);
        const sanitizedInput = await sanitizeJsTsAnalysisInput(request.data, baseDir);
        const output = await analyzeJSTS(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-css': {
        const data = request.data as Record<string, unknown>;
        const baseDir = resolveBaseDir(data.filePath as string, data.configuration);
        const sanitizedInput = await sanitizeCssAnalysisInput(request.data, baseDir);
        const output = await analyzeCSS(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-yaml': {
        const data = request.data as Record<string, unknown>;
        const baseDir = resolveBaseDir(data.filePath as string, data.configuration);
        const sanitizedInput = await sanitizeAnalysisInput(request.data, baseDir);
        const output = await analyzeYAML(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-html': {
        const data = request.data as Record<string, unknown>;
        const baseDir = resolveBaseDir(data.filePath as string, data.configuration);
        const sanitizedInput = await sanitizeAnalysisInput(request.data, baseDir);
        const output = await analyzeHTML(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-project': {
        logHeapStatistics(workerData?.debugMemory);
        const sanitizedInput = sanitizeProjectAnalysisInput(request.data);

        // Get sanitized files via file store
        const { filesToAnalyze, pendingFiles } = await getFilesToAnalyze(
          sanitizedInput.baseDir,
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
