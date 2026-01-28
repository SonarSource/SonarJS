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
import * as grpc from '@grpc/grpc-js';
import type { bridge } from './proto/bridge.js';
import {
  transformInitLinterRequest,
  transformAnalyzeJsTsRequest,
  transformAnalyzeJsTsResponse,
  transformAnalyzeCssRequest,
  transformAnalyzeCssResponse,
  transformAnalyzeYamlRequest,
  transformAnalyzeYamlResponse,
  transformAnalyzeHtmlRequest,
  transformAnalyzeHtmlResponse,
  transformAnalyzeProjectRequest,
  transformFileResult,
  transformError,
} from './bridge-transformers/index.js';
import { Linter } from '../../jsts/src/linter/linter.js';
import { analyzeJSTS } from '../../jsts/src/analysis/analyzer.js';
import { analyzeCSS } from '../../css/src/analysis/analyzer.js';
import { analyzeYAML } from '../../yaml/src/index.js';
import { analyzeHTML } from '../../html/src/index.js';
import {
  analyzeProject,
  cancelAnalysis,
} from '../../jsts/src/analysis/projectAnalysis/analyzeProject.js';
import { info, error as logError } from '../../shared/src/helpers/logging.js';
import type { WsIncrementalResult } from '../../bridge/src/request.js';

/**
 * Handle InitLinter RPC - initialize the linter with rules and configuration.
 */
export async function initLinterHandler(
  call: grpc.ServerUnaryCall<bridge.IInitLinterRequest, bridge.IInitLinterResponse>,
  callback: grpc.sendUnaryData<bridge.IInitLinterResponse>,
): Promise<void> {
  const request = call.request;

  try {
    info(`InitLinter: initializing with ${request.rules?.length ?? 0} rules`);
    const input = transformInitLinterRequest(request);
    await Linter.initialize(input);
    callback(null, { success: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`InitLinter error: ${errorMessage}`);
    callback(null, { success: false, error: errorMessage });
  }
}

/**
 * Handle AnalyzeJsTs RPC - analyze a single JavaScript/TypeScript file.
 */
export async function analyzeJsTsHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeJsTsRequest, bridge.IAnalyzeJsTsResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeJsTsResponse>,
): Promise<void> {
  const request = call.request;

  try {
    info(`AnalyzeJsTs: ${request.filePath}`);
    const input = transformAnalyzeJsTsRequest(request);
    const output = await analyzeJSTS(input);
    const response = transformAnalyzeJsTsResponse(output as any);
    callback(null, response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`AnalyzeJsTs error: ${errorMessage}`);
    callback({
      code: grpc.status.INTERNAL,
      message: errorMessage,
    });
  }
}

/**
 * Handle AnalyzeCss RPC - analyze a single CSS file.
 */
export async function analyzeCssHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeCssRequest, bridge.IAnalyzeCssResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeCssResponse>,
): Promise<void> {
  const request = call.request;

  try {
    info(`AnalyzeCss: ${request.filePath}`);
    const input = transformAnalyzeCssRequest(request);
    const output = await analyzeCSS(input);
    const response = transformAnalyzeCssResponse(output as any);
    callback(null, response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`AnalyzeCss error: ${errorMessage}`);
    callback({
      code: grpc.status.INTERNAL,
      message: errorMessage,
    });
  }
}

/**
 * Handle AnalyzeYaml RPC - analyze a YAML file with embedded JS.
 */
export async function analyzeYamlHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeYamlRequest, bridge.IAnalyzeYamlResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeYamlResponse>,
): Promise<void> {
  const request = call.request;

  try {
    info(`AnalyzeYaml: ${request.filePath}`);
    const input = transformAnalyzeYamlRequest(request);
    const output = await analyzeYAML(input);
    const response = transformAnalyzeYamlResponse(output as any);
    callback(null, response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`AnalyzeYaml error: ${errorMessage}`);
    callback({
      code: grpc.status.INTERNAL,
      message: errorMessage,
    });
  }
}

/**
 * Handle AnalyzeHtml RPC - analyze an HTML file with embedded JS.
 */
export async function analyzeHtmlHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeHtmlRequest, bridge.IAnalyzeHtmlResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeHtmlResponse>,
): Promise<void> {
  const request = call.request;

  try {
    info(`AnalyzeHtml: ${request.filePath}`);
    const input = transformAnalyzeHtmlRequest(request);
    const output = await analyzeHTML(input);
    const response = transformAnalyzeHtmlResponse(output as any);
    callback(null, response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`AnalyzeHtml error: ${errorMessage}`);
    callback({
      code: grpc.status.INTERNAL,
      message: errorMessage,
    });
  }
}

/**
 * Handle AnalyzeProject RPC - analyze entire project with streaming results.
 * This replaces the WebSocket-based project analysis.
 */
export async function analyzeProjectHandler(
  call: grpc.ServerWritableStream<bridge.IAnalyzeProjectRequest, bridge.IAnalyzeProjectResponse>,
): Promise<void> {
  const request = call.request;

  try {
    const fileCount = request.files ? Object.keys(request.files).length : 0;
    info(`AnalyzeProject: starting analysis of ${fileCount} files`);

    const input = transformAnalyzeProjectRequest(request);

    // Create incremental results channel that streams to client
    const incrementalResultsChannel = (result: WsIncrementalResult): void => {
      // Check if client cancelled
      if (call.cancelled) {
        info('AnalyzeProject: client cancelled, stopping analysis');
        cancelAnalysis();
        return;
      }

      // Handle backpressure - if write buffer is full, wait
      // Note: grpc-js handles this internally, but we check cancelled state

      if (result.messageType === 'fileResult') {
        const fileResult = transformFileResult(result.filename, result);
        call.write({ fileResult });
      } else if (result.messageType === 'meta') {
        call.write({
          meta: {
            warnings: result.warnings || [],
          },
        });
      } else if (result.messageType === 'cancelled') {
        call.write({ cancelled: {} });
      } else if (result.messageType === 'error') {
        const errorResult = transformError(result.error as any);
        call.write({ error: errorResult });
      }
    };

    // Set up cancellation handler
    call.on('cancelled', () => {
      info('AnalyzeProject: received cancellation signal');
      cancelAnalysis();
    });

    const output = await analyzeProject(input, incrementalResultsChannel);

    // Send final meta with warnings
    call.write({
      meta: {
        warnings: output.meta.warnings,
      },
    });

    info(`AnalyzeProject: completed analysis of ${fileCount} files`);
    call.end();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`AnalyzeProject error: ${errorMessage}`);

    // Send error and end stream
    call.write({
      error: {
        code: 'ANALYSIS_ERROR',
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    call.end();
  }
}

/**
 * Handle CancelAnalysis RPC - cancel ongoing analysis.
 */
export async function cancelAnalysisHandler(
  _call: grpc.ServerUnaryCall<bridge.ICancelAnalysisRequest, bridge.ICancelAnalysisResponse>,
  callback: grpc.sendUnaryData<bridge.ICancelAnalysisResponse>,
): Promise<void> {
  try {
    info('CancelAnalysis: cancelling ongoing analysis');
    cancelAnalysis();
    callback(null, { success: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`CancelAnalysis error: ${errorMessage}`);
    callback(null, { success: false });
  }
}

/**
 * Handle Close RPC - graceful shutdown.
 */
export async function closeHandler(
  _call: grpc.ServerUnaryCall<bridge.ICloseRequest, bridge.ICloseResponse>,
  callback: grpc.sendUnaryData<bridge.ICloseResponse>,
): Promise<void> {
  try {
    info('Close: initiating graceful shutdown');
    callback(null, { success: true });

    // Schedule shutdown after response is sent
    setImmediate(() => {
      process.exit(0);
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`Close error: ${errorMessage}`);
    callback(null, { success: false });
  }
}
