# Phase 2: Node.js gRPC Service Implementation

## Objective

Implement gRPC service handlers in the Node.js bridge that match the current HTTP endpoint behavior, integrating with the existing gRPC server infrastructure at `packages/grpc/`.

## Prerequisites

- Phase 1 completed (proto file created and TypeScript types generated)
- Proto definitions finalized and reviewed

## Duration

**Estimated: 6.75 days**

---

## Tasks

### P2-T01: Create bridge service implementation file

**Description**: Create `packages/grpc/src/bridge-service.ts` with handlers for all RPCs, delegating to existing analysis logic.

**File**: `packages/grpc/src/bridge-service.ts`

**Estimated Effort**: 3 days

#### Technical Specification

```typescript
// packages/grpc/src/bridge-service.ts
import * as grpc from '@grpc/grpc-js';
import { bridge } from './proto/bridge.js';
import { handleRequest } from '../../bridge/src/handle-request.js';
import { initializeLinter } from '../../jsts/src/linter/linter.js';
import {
  analyzeProject,
  cancelAnalysis,
} from '../../jsts/src/analysis/projectAnalysis/analyzeProject.js';
import { analyzeJSTS } from '../../jsts/src/analysis/analyzer.js';
import { analyzeCSS } from '../../css/src/analysis/analyzer.js';
import { analyzeHTML } from '../../html/src/index.js';
import { analyzeYAML } from '../../yaml/src/index.js';
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

/**
 * InitLinter RPC handler
 * Initializes ESLint with the provided rules and configuration
 */
export function initLinterHandler(
  call: grpc.ServerUnaryCall<bridge.IInitLinterRequest, bridge.IInitLinterResponse>,
  callback: grpc.sendUnaryData<bridge.IInitLinterResponse>,
): void {
  try {
    const request = transformInitLinterRequest(call.request);
    initializeLinter(request.rules, request.environments, request.globals);
    callback(null, { success: true });
  } catch (error) {
    callback(null, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * AnalyzeJsTs RPC handler
 * Analyzes a single JavaScript or TypeScript file
 */
export async function analyzeJsTsHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeJsTsRequest, bridge.IAnalyzeJsTsResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeJsTsResponse>,
): Promise<void> {
  try {
    const request = transformAnalyzeJsTsRequest(call.request);
    const result = await analyzeJSTS(request);
    const response = transformAnalyzeJsTsResponse(result);
    callback(null, response);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * AnalyzeCss RPC handler
 * Analyzes a single CSS file
 */
export async function analyzeCssHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeCssRequest, bridge.IAnalyzeCssResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeCssResponse>,
): Promise<void> {
  try {
    const request = transformAnalyzeCssRequest(call.request);
    const result = await analyzeCSS(request);
    const response = transformAnalyzeCssResponse(result);
    callback(null, response);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * AnalyzeYaml RPC handler
 * Analyzes a YAML file containing embedded JavaScript
 */
export async function analyzeYamlHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeYamlRequest, bridge.IAnalyzeYamlResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeYamlResponse>,
): Promise<void> {
  try {
    const request = transformAnalyzeYamlRequest(call.request);
    const result = await analyzeYAML(request);
    const response = transformAnalyzeYamlResponse(result);
    callback(null, response);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * AnalyzeHtml RPC handler
 * Analyzes an HTML file containing embedded JavaScript
 */
export async function analyzeHtmlHandler(
  call: grpc.ServerUnaryCall<bridge.IAnalyzeHtmlRequest, bridge.IAnalyzeHtmlResponse>,
  callback: grpc.sendUnaryData<bridge.IAnalyzeHtmlResponse>,
): Promise<void> {
  try {
    const request = transformAnalyzeHtmlRequest(call.request);
    const result = await analyzeHTML(request);
    const response = transformAnalyzeHtmlResponse(result);
    callback(null, response);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * AnalyzeProject RPC handler (server streaming)
 * Analyzes entire project with streaming results, replacing WebSocket
 */
export async function analyzeProjectHandler(
  call: grpc.ServerWritableStream<bridge.IAnalyzeProjectRequest, bridge.IAnalyzeProjectResponse>,
): Promise<void> {
  const request = transformAnalyzeProjectRequest(call.request);

  try {
    await analyzeProject(request, result => {
      // Stream each result back to the client
      if (result.messageType === 'fileResult') {
        call.write({
          fileResult: transformFileResult(result),
        });
      } else if (result.messageType === 'meta') {
        call.write({
          meta: { warnings: result.warnings },
        });
      } else if (result.messageType === 'cancelled') {
        call.write({ cancelled: {} });
      } else if (result.messageType === 'error') {
        call.write({
          error: transformError(result.error),
        });
      }
    });
    call.end();
  } catch (error) {
    call.destroy(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * CancelAnalysis RPC handler
 * Cancels ongoing project analysis
 */
export function cancelAnalysisHandler(
  call: grpc.ServerUnaryCall<bridge.ICancelAnalysisRequest, bridge.ICancelAnalysisResponse>,
  callback: grpc.sendUnaryData<bridge.ICancelAnalysisResponse>,
): void {
  try {
    cancelAnalysis();
    callback(null, { success: true });
  } catch (error) {
    callback(null, { success: false });
  }
}

/**
 * Close RPC handler
 * Gracefully shuts down the server
 */
export function closeHandler(
  call: grpc.ServerUnaryCall<bridge.ICloseRequest, bridge.ICloseResponse>,
  callback: grpc.sendUnaryData<bridge.ICloseResponse>,
): void {
  callback(null, { success: true });
  // Schedule shutdown after response is sent
  setImmediate(() => {
    process.exit(0);
  });
}

/**
 * Bridge service implementation object for gRPC server registration
 */
export const bridgeServiceImplementation = {
  initLinter: initLinterHandler,
  analyzeJsTs: analyzeJsTsHandler,
  analyzeCss: analyzeCssHandler,
  analyzeYaml: analyzeYamlHandler,
  analyzeHtml: analyzeHtmlHandler,
  analyzeProject: analyzeProjectHandler,
  cancelAnalysis: cancelAnalysisHandler,
  close: closeHandler,
};
```

#### Files Affected

| Action | File                                  |
| ------ | ------------------------------------- |
| CREATE | `packages/grpc/src/bridge-service.ts` |

#### Acceptance Criteria

- [ ] All 8 RPC handlers implemented (InitLinter, AnalyzeJsTs, AnalyzeCss, AnalyzeYaml, AnalyzeHtml, AnalyzeProject, CancelAnalysis, Close)
- [ ] Handlers delegate to existing analysis logic (no duplication)
- [ ] Error handling matches current HTTP behavior
- [ ] Streaming handler sends incremental results
- [ ] TypeScript compiles without errors

---

### P2-T02: Create request/response transformers

**Description**: Create transformer functions to convert between gRPC message types and internal TypeScript types used by the analysis logic.

**Directory**: `packages/grpc/src/bridge-transformers/`

**Estimated Effort**: 2 days

#### Technical Specification

Create the following transformer files:

##### `packages/grpc/src/bridge-transformers/init-linter.ts`

```typescript
import { bridge } from '../proto/bridge.js';
import type { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';

export interface InitLinterInput {
  rules: RuleConfig[];
  environments: string[];
  globals: string[];
  baseDir: string;
  sonarlint: boolean;
  bundles: string[];
  rulesWorkdir: string;
}

export function transformInitLinterRequest(request: bridge.IInitLinterRequest): InitLinterInput {
  return {
    rules: (request.rules || []).map(rule => ({
      key: rule.key || '',
      fileTypeTargets: rule.fileTypeTargets || [],
      configurations: (rule.configurations || []).map(c => JSON.parse(c)),
      analysisModes: rule.analysisModes || [],
      blacklistedExtensions: rule.blacklistedExtensions || [],
      language: rule.language || 'js',
    })),
    environments: request.environments || [],
    globals: request.globals || [],
    baseDir: request.baseDir || '',
    sonarlint: request.sonarlint || false,
    bundles: request.bundles || [],
    rulesWorkdir: request.rulesWorkdir || '',
  };
}
```

##### `packages/grpc/src/bridge-transformers/analyze-jsts.ts`

```typescript
import { bridge } from '../proto/bridge.js';
import type { JsTsAnalysisInput, JsTsAnalysisOutput } from '../../../jsts/src/analysis/analyzer.js';

export function transformAnalyzeJsTsRequest(
  request: bridge.IAnalyzeJsTsRequest,
): JsTsAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileType: request.fileType || 'MAIN',
    fileContent: request.fileContent ?? undefined,
    ignoreHeaderComments: request.ignoreHeaderComments || false,
    tsConfigs: request.tsConfigs || [],
    programId: request.programId ?? undefined,
    fileStatus: request.fileStatus || 'ADDED',
    analysisMode: request.analysisMode || 'DEFAULT',
    skipAst: request.skipAst || false,
    shouldClearDependenciesCache: request.shouldClearDependenciesCache || false,
    sonarlint: request.sonarlint || false,
    allowTsParserJsFiles: request.allowTsParserJsFiles || false,
    configuration: request.configuration
      ? transformProjectConfiguration(request.configuration)
      : undefined,
  };
}

export function transformAnalyzeJsTsResponse(
  result: JsTsAnalysisOutput,
): bridge.IAnalyzeJsTsResponse {
  return {
    parsingError: result.parsingError
      ? {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        }
      : undefined,
    issues: (result.issues || []).map(issue => ({
      line: issue.line,
      column: issue.column,
      endLine: issue.endLine,
      endColumn: issue.endColumn,
      message: issue.message,
      ruleId: issue.ruleId,
      language: issue.language,
      secondaryLocations: (issue.secondaryLocations || []).map(loc => ({
        line: loc.line,
        column: loc.column,
        endLine: loc.endLine,
        endColumn: loc.endColumn,
        message: loc.message,
      })),
      cost: issue.cost,
      quickFixes: (issue.quickFixes || []).map(qf => ({
        message: qf.message,
        edits: (qf.edits || []).map(edit => ({
          text: edit.text,
          loc: {
            line: edit.loc.line,
            column: edit.loc.column,
            endLine: edit.loc.endLine,
            endColumn: edit.loc.endColumn,
          },
        })),
      })),
      ruleEslintKeys: issue.ruleEslintKeys,
      filePath: issue.filePath,
    })),
    highlights: (result.highlights || []).map(h => ({
      location: {
        startLine: h.location.startLine,
        startCol: h.location.startCol,
        endLine: h.location.endLine,
        endCol: h.location.endCol,
      },
      textType: h.textType,
    })),
    highlightedSymbols: (result.highlightedSymbols || []).map(hs => ({
      declaration: {
        startLine: hs.declaration.startLine,
        startCol: hs.declaration.startCol,
        endLine: hs.declaration.endLine,
        endCol: hs.declaration.endCol,
      },
      references: (hs.references || []).map(ref => ({
        startLine: ref.startLine,
        startCol: ref.startCol,
        endLine: ref.endLine,
        endCol: ref.endCol,
      })),
    })),
    metrics: result.metrics
      ? {
          ncloc: result.metrics.ncloc,
          commentLines: result.metrics.commentLines,
          nosonarLines: result.metrics.nosonarLines,
          executableLines: result.metrics.executableLines,
          functions: result.metrics.functions,
          statements: result.metrics.statements,
          classes: result.metrics.classes,
          complexity: result.metrics.complexity,
          cognitiveComplexity: result.metrics.cognitiveComplexity,
        }
      : undefined,
    cpdTokens: (result.cpdTokens || []).map(token => ({
      location: {
        startLine: token.location.startLine,
        startCol: token.location.startCol,
        endLine: token.location.endLine,
        endCol: token.location.endCol,
      },
      image: token.image,
    })),
    ast: result.ast,
  };
}

function transformProjectConfiguration(
  config: bridge.IProjectAnalysisConfiguration,
): ProjectConfiguration {
  return {
    baseDir: config.baseDir || '',
    sonarlint: config.sonarlint || false,
    fsEvents: config.fsEvents || {},
    allowTsParserJsFiles: config.allowTsParserJsFiles || false,
    analysisMode: config.analysisMode || 'DEFAULT',
    skipAst: config.skipAst || false,
    ignoreHeaderComments: config.ignoreHeaderComments || false,
    maxFileSize: Number(config.maxFileSize) || 0,
    environments: config.environments || [],
    globals: config.globals || [],
    tsSuffixes: config.tsSuffixes || [],
    jsSuffixes: config.jsSuffixes || [],
    cssSuffixes: config.cssSuffixes || [],
    tsConfigPaths: config.tsConfigPaths || [],
    jsTsExclusions: config.jsTsExclusions || [],
    sources: config.sources || [],
    inclusions: config.inclusions || [],
    exclusions: config.exclusions || [],
    tests: config.tests || [],
    testInclusions: config.testInclusions || [],
    testExclusions: config.testExclusions || [],
    detectBundles: config.detectBundles || false,
    canAccessFileSystem: config.canAccessFileSystem || true,
  };
}
```

##### `packages/grpc/src/bridge-transformers/analyze-css.ts`

```typescript
import { bridge } from '../proto/bridge.js';
import type { CssAnalysisInput, CssAnalysisOutput } from '../../../css/src/analysis/analyzer.js';

export function transformAnalyzeCssRequest(request: bridge.IAnalyzeCssRequest): CssAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileContent: request.fileContent ?? undefined,
    rules: (request.rules || []).map(rule => ({
      key: rule.key || '',
      configurations: (rule.configurations || []).map(c => JSON.parse(c)),
    })),
  };
}

export function transformAnalyzeCssResponse(result: CssAnalysisOutput): bridge.IAnalyzeCssResponse {
  return {
    parsingError: result.parsingError
      ? {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        }
      : undefined,
    issues: (result.issues || []).map(issue => ({
      line: issue.line,
      column: issue.column,
      endLine: issue.endLine,
      endColumn: issue.endColumn,
      message: issue.message,
      ruleId: issue.ruleId,
    })),
  };
}
```

##### `packages/grpc/src/bridge-transformers/analyze-embedded.ts`

```typescript
import { bridge } from '../proto/bridge.js';
import type { EmbeddedAnalysisInput, EmbeddedAnalysisOutput } from '../../../html/src/index.js';

export function transformAnalyzeYamlRequest(
  request: bridge.IAnalyzeYamlRequest,
): EmbeddedAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileContent: request.fileContent ?? undefined,
  };
}

export function transformAnalyzeYamlResponse(
  result: EmbeddedAnalysisOutput,
): bridge.IAnalyzeYamlResponse {
  return {
    parsingError: result.parsingError
      ? {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        }
      : undefined,
    issues: transformIssues(result.issues),
    metrics: {
      ncloc: result.metrics?.ncloc || [],
    },
  };
}

export function transformAnalyzeHtmlRequest(
  request: bridge.IAnalyzeHtmlRequest,
): EmbeddedAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileContent: request.fileContent ?? undefined,
  };
}

export function transformAnalyzeHtmlResponse(
  result: EmbeddedAnalysisOutput,
): bridge.IAnalyzeHtmlResponse {
  return {
    parsingError: result.parsingError
      ? {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        }
      : undefined,
    issues: transformIssues(result.issues),
    metrics: {
      ncloc: result.metrics?.ncloc || [],
    },
  };
}

function transformIssues(issues: any[]): bridge.IIssue[] {
  return (issues || []).map(issue => ({
    line: issue.line,
    column: issue.column,
    endLine: issue.endLine,
    endColumn: issue.endColumn,
    message: issue.message,
    ruleId: issue.ruleId,
    language: issue.language,
    secondaryLocations: (issue.secondaryLocations || []).map((loc: any) => ({
      line: loc.line,
      column: loc.column,
      endLine: loc.endLine,
      endColumn: loc.endColumn,
      message: loc.message,
    })),
    cost: issue.cost,
    quickFixes: (issue.quickFixes || []).map((qf: any) => ({
      message: qf.message,
      edits: (qf.edits || []).map((edit: any) => ({
        text: edit.text,
        loc: {
          line: edit.loc.line,
          column: edit.loc.column,
          endLine: edit.loc.endLine,
          endColumn: edit.loc.endColumn,
        },
      })),
    })),
    ruleEslintKeys: issue.ruleEslintKeys,
    filePath: issue.filePath,
  }));
}
```

##### `packages/grpc/src/bridge-transformers/analyze-project.ts`

```typescript
import { bridge } from '../proto/bridge.js';
import type {
  ProjectAnalysisInput,
  FileResult,
  AnalysisError,
} from '../../../jsts/src/analysis/projectAnalysis/analyzeProject.js';
import { transformAnalyzeJsTsResponse } from './analyze-jsts.js';

export function transformAnalyzeProjectRequest(
  request: bridge.IAnalyzeProjectRequest,
): ProjectAnalysisInput {
  const files: Record<string, any> = {};
  if (request.files) {
    for (const [key, value] of Object.entries(request.files)) {
      files[key] = {
        filePath: value.filePath || '',
        fileType: value.fileType || 'MAIN',
        fileStatus: value.fileStatus || 'ADDED',
        fileContent: value.fileContent ?? undefined,
      };
    }
  }

  return {
    files,
    rules: (request.rules || []).map(rule => ({
      key: rule.key || '',
      fileTypeTargets: rule.fileTypeTargets || [],
      configurations: (rule.configurations || []).map(c => JSON.parse(c)),
      analysisModes: rule.analysisModes || [],
      blacklistedExtensions: rule.blacklistedExtensions || [],
      language: rule.language || 'js',
    })),
    configuration: request.configuration
      ? {
          baseDir: request.configuration.baseDir || '',
          sonarlint: request.configuration.sonarlint || false,
          fsEvents: request.configuration.fsEvents || {},
          allowTsParserJsFiles: request.configuration.allowTsParserJsFiles || false,
          analysisMode: request.configuration.analysisMode || 'DEFAULT',
          skipAst: request.configuration.skipAst || false,
          ignoreHeaderComments: request.configuration.ignoreHeaderComments || false,
          maxFileSize: Number(request.configuration.maxFileSize) || 0,
          environments: request.configuration.environments || [],
          globals: request.configuration.globals || [],
          tsSuffixes: request.configuration.tsSuffixes || [],
          jsSuffixes: request.configuration.jsSuffixes || [],
          cssSuffixes: request.configuration.cssSuffixes || [],
          tsConfigPaths: request.configuration.tsConfigPaths || [],
          jsTsExclusions: request.configuration.jsTsExclusions || [],
          sources: request.configuration.sources || [],
          inclusions: request.configuration.inclusions || [],
          exclusions: request.configuration.exclusions || [],
          tests: request.configuration.tests || [],
          testInclusions: request.configuration.testInclusions || [],
          testExclusions: request.configuration.testExclusions || [],
          detectBundles: request.configuration.detectBundles || false,
          canAccessFileSystem: request.configuration.canAccessFileSystem ?? true,
        }
      : undefined,
    bundles: request.bundles || [],
    rulesWorkdir: request.rulesWorkdir || '',
  };
}

export function transformFileResult(result: FileResult): bridge.IFileAnalysisResult {
  return {
    filename: result.filename,
    analysis: transformAnalyzeJsTsResponse(result.analysis),
  };
}

export function transformError(error: AnalysisError): bridge.IAnalysisError {
  return {
    code: error.code,
    message: error.message,
    stack: error.stack,
  };
}
```

##### `packages/grpc/src/bridge-transformers/index.ts`

```typescript
export { transformInitLinterRequest, type InitLinterInput } from './init-linter.js';

export { transformAnalyzeJsTsRequest, transformAnalyzeJsTsResponse } from './analyze-jsts.js';

export { transformAnalyzeCssRequest, transformAnalyzeCssResponse } from './analyze-css.js';

export {
  transformAnalyzeYamlRequest,
  transformAnalyzeYamlResponse,
  transformAnalyzeHtmlRequest,
  transformAnalyzeHtmlResponse,
} from './analyze-embedded.js';

export {
  transformAnalyzeProjectRequest,
  transformFileResult,
  transformError,
} from './analyze-project.js';
```

#### Files Affected

| Action | File                                                        |
| ------ | ----------------------------------------------------------- |
| CREATE | `packages/grpc/src/bridge-transformers/init-linter.ts`      |
| CREATE | `packages/grpc/src/bridge-transformers/analyze-jsts.ts`     |
| CREATE | `packages/grpc/src/bridge-transformers/analyze-css.ts`      |
| CREATE | `packages/grpc/src/bridge-transformers/analyze-embedded.ts` |
| CREATE | `packages/grpc/src/bridge-transformers/analyze-project.ts`  |
| CREATE | `packages/grpc/src/bridge-transformers/index.ts`            |

#### Acceptance Criteria

- [ ] All transformer functions handle null/undefined fields gracefully
- [ ] JSON-encoded configurations are properly parsed
- [ ] Optional fields are handled with proper defaults
- [ ] TypeScript compiles without errors
- [ ] Unit tests cover edge cases (empty arrays, missing fields, etc.)

---

### P2-T03: Integrate bridge service into gRPC server

**Description**: Register the BridgeService in the existing gRPC server alongside LanguageAnalyzerService and Health service.

**File**: `packages/grpc/src/server.ts`

**Estimated Effort**: 0.5 days

#### Technical Specification

Modify `packages/grpc/src/server.ts` to register the BridgeService:

```typescript
// packages/grpc/src/server.ts
import * as grpc from '@grpc/grpc-js';
import { analyzerServiceDefinition, analyzerImplementation } from './service.js';
import { healthServiceDefinition, healthImplementation } from './health-service.js';
import { bridgeServiceDefinition, bridgeServiceImplementation } from './bridge-service.js';

export function createGrpcServer(): grpc.Server {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
    'grpc.max_send_message_length': 100 * 1024 * 1024, // 100MB
  });

  // Existing services (A3S clients)
  server.addService(analyzerServiceDefinition, analyzerImplementation);
  server.addService(healthServiceDefinition, healthImplementation);

  // NEW: Bridge service for Java plugin communication
  server.addService(bridgeServiceDefinition, bridgeServiceImplementation);

  return server;
}

export function startGrpcServer(server: grpc.Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        reject(error);
        return;
      }
      console.log(`gRPC server listening on port ${port}`);
      resolve();
    });
  });
}
```

#### Files Affected

| Action | File                          |
| ------ | ----------------------------- |
| MODIFY | `packages/grpc/src/server.ts` |

#### Acceptance Criteria

- [ ] BridgeService registered alongside existing services
- [ ] Existing LanguageAnalyzerService and Health service continue to work
- [ ] Max message size configured to 100MB for large file support
- [ ] Server starts successfully with all three services

---

### P2-T04: Implement streaming for project analysis

**Description**: Implement the server streaming RPC handler that sends incremental results, replacing the current WebSocket-based streaming.

**Estimated Effort**: 1 day

#### Technical Specification

The streaming handler is already defined in P2-T01 (`analyzeProjectHandler`). This task focuses on:

1. Ensuring proper backpressure handling
2. Implementing cancellation detection (client disconnect)
3. Proper cleanup on stream end

```typescript
// Enhanced streaming implementation with cancellation support
export async function analyzeProjectHandler(
  call: grpc.ServerWritableStream<bridge.IAnalyzeProjectRequest, bridge.IAnalyzeProjectResponse>,
): Promise<void> {
  const request = transformAnalyzeProjectRequest(call.request);
  let cancelled = false;

  // Handle client cancellation
  call.on('cancelled', () => {
    cancelled = true;
    cancelAnalysis();
  });

  try {
    await analyzeProject(request, result => {
      if (cancelled) {
        return; // Stop processing if cancelled
      }

      // Check if write buffer is full (backpressure)
      const canWrite = call.write(transformResult(result));
      if (!canWrite) {
        // Wait for drain event before continuing
        // Note: In practice, the analyzeProject callback may need to be
        // adapted to support async/await for proper backpressure handling
      }
    });

    if (!cancelled) {
      call.end();
    }
  } catch (error) {
    if (!cancelled) {
      call.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

function transformResult(result: any): bridge.IAnalyzeProjectResponse {
  switch (result.messageType) {
    case 'fileResult':
      return { fileResult: transformFileResult(result) };
    case 'meta':
      return { meta: { warnings: result.warnings } };
    case 'cancelled':
      return { cancelled: {} };
    case 'error':
      return { error: transformError(result.error) };
    default:
      throw new Error(`Unknown message type: ${result.messageType}`);
  }
}
```

#### Files Affected

| Action | File                                                              |
| ------ | ----------------------------------------------------------------- |
| MODIFY | `packages/grpc/src/bridge-service.ts` (enhance streaming handler) |

#### Acceptance Criteria

- [ ] Streaming sends results incrementally as files are analyzed
- [ ] Client can receive partial results before project analysis completes
- [ ] Client cancellation (disconnect) triggers analysis cancellation
- [ ] CancelAnalysis RPC also cancels ongoing streaming
- [ ] Errors during analysis are properly propagated to client
- [ ] Stream ends cleanly after all files are processed

---

### P2-T05: Update health check to include BridgeService

**Description**: Modify the health check handler to report on BridgeService status alongside existing services.

**File**: `packages/grpc/src/health-service.ts`

**Estimated Effort**: 0.25 days

#### Technical Specification

The health service should report SERVING status for all services:

```typescript
// packages/grpc/src/health-service.ts
import * as grpc from '@grpc/grpc-js';
import { health } from './proto/health.js';

const serviceStatus: Map<string, health.HealthCheckResponse.ServingStatus> = new Map([
  ['', health.HealthCheckResponse.ServingStatus.SERVING], // Overall server health
  ['language_analyzer.LanguageAnalyzerService', health.HealthCheckResponse.ServingStatus.SERVING],
  ['bridge.BridgeService', health.HealthCheckResponse.ServingStatus.SERVING], // NEW
]);

export function checkHandler(
  call: grpc.ServerUnaryCall<health.IHealthCheckRequest, health.IHealthCheckResponse>,
  callback: grpc.sendUnaryData<health.IHealthCheckResponse>,
): void {
  const service = call.request.service || '';
  const status = serviceStatus.get(service);

  if (status !== undefined) {
    callback(null, { status });
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      message: `Service '${service}' not found`,
    });
  }
}
```

#### Files Affected

| Action | File                                  |
| ------ | ------------------------------------- |
| MODIFY | `packages/grpc/src/health-service.ts` |

#### Acceptance Criteria

- [ ] Health check returns SERVING for `bridge.BridgeService`
- [ ] Health check returns SERVING for empty service name (overall status)
- [ ] Existing health checks for LanguageAnalyzerService continue to work

---

## Deliverables

1. `packages/grpc/src/bridge-service.ts` - Complete service implementation
2. `packages/grpc/src/bridge-transformers/` - All transformer files
3. Modified `packages/grpc/src/server.ts` - With BridgeService registration
4. Modified `packages/grpc/src/health-service.ts` - With BridgeService health

## Exit Criteria

- [ ] All RPC handlers implemented and tested
- [ ] Streaming project analysis works correctly
- [ ] Health check reports all services
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass for all new code

## Dependencies

- Phase 1 (proto definitions and generated types)

## Risks and Mitigations

| Risk                                | Impact | Likelihood | Mitigation                                                   |
| ----------------------------------- | ------ | ---------- | ------------------------------------------------------------ |
| Import paths differ from plan       | Medium | High       | Verify actual import paths in codebase before implementation |
| Streaming backpressure issues       | Medium | Medium     | Implement drain handling, test with large projects           |
| Analysis function signatures differ | High   | Medium     | Review actual function signatures in codebase                |
