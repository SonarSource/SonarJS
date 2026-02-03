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
import { normalizeToAbsolutePath, dirnamePath, ROOT_PATH } from '../../shared/src/helpers/files.js';
import {
  isString,
  sanitizeAnalysisInput,
  sanitizeJsTsAnalysisInput,
  sanitizePaths,
} from '../../shared/src/helpers/sanitize.js';
import type { RawConfiguration } from '../../shared/src/helpers/configuration.js';
import type { NormalizedAbsolutePath } from '../../shared/src/helpers/files.js';

/**
 * Resolves the base directory for single-file analysis and sets global configuration.
 * Uses provided configuration if available, otherwise derives baseDir from the file path.
 * When no configuration is provided, the default configuration is used (already initialized).
 */
function resolveBaseDir(
  filePath: string,
  configuration?: RawConfiguration,
): NormalizedAbsolutePath {
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
        const { rules, environments, globals, baseDir, sonarlint, bundles, rulesWorkdir } =
          request.data;
        const sanitizedBaseDir = isString(baseDir) ? normalizeToAbsolutePath(baseDir) : ROOT_PATH;
        await Linter.initialize({
          rules,
          environments,
          globals,
          baseDir: sanitizedBaseDir,
          sonarlint,
          bundles: sanitizePaths(bundles, sanitizedBaseDir),
          rulesWorkdir: isString(rulesWorkdir)
            ? normalizeToAbsolutePath(rulesWorkdir, sanitizedBaseDir)
            : undefined,
        });
        return { type: 'success', result: 'OK' };
      }
      case 'on-analyze-jsts': {
        const baseDir = resolveBaseDir(request.data.filePath, request.data.configuration);
        const sanitizedInput = await sanitizeJsTsAnalysisInput(request.data, baseDir);
        const output = await analyzeJSTS(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-css': {
        const baseDir = resolveBaseDir(request.data.filePath, request.data.configuration);
        const baseInput = await sanitizeAnalysisInput(request.data, baseDir);
        const sanitizedInput = { ...baseInput, rules: request.data.rules };
        const output = await analyzeCSS(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-yaml': {
        const baseDir = resolveBaseDir(request.data.filePath, request.data.configuration);
        const sanitizedInput = await sanitizeAnalysisInput(request.data, baseDir);
        const output = await analyzeYAML(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-html': {
        const baseDir = resolveBaseDir(request.data.filePath, request.data.configuration);
        const sanitizedInput = await sanitizeAnalysisInput(request.data, baseDir);
        const output = await analyzeHTML(sanitizedInput);
        return { type: 'success', result: output };
      }
      case 'on-analyze-project': {
        logHeapStatistics(workerData?.debugMemory);
        const { rules, files, configuration, bundles, rulesWorkdir } = request.data;

        if (!configuration?.baseDir) {
          throw 'baseDir is required';
        }
        // 1. Sanitize configuration (sets global config including baseDir)
        setGlobalConfiguration(configuration);
        const baseDir = getBaseDir();

        // 2. Get sanitized files via file store
        const { filesToAnalyze, pendingFiles } = await getFilesToAnalyze(baseDir, files);

        // 3. Build sanitized input
        const sanitizedInput = {
          filesToAnalyze,
          pendingFiles,
          rules,
          bundles: sanitizePaths(bundles, baseDir),
          rulesWorkdir: rulesWorkdir ? normalizeToAbsolutePath(rulesWorkdir, baseDir) : undefined,
        };

        const output = await analyzeProject(sanitizedInput, incrementalResultsChannel);
        logHeapStatistics(workerData?.debugMemory);
        return { type: 'success', result: output };
      }
      case 'on-cancel-analysis': {
        cancelAnalysis();
        return { type: 'success', result: 'OK' };
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
