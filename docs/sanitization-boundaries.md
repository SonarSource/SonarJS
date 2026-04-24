# Sanitization Boundaries: Raw vs Internal Types

## Overview

This document describes the trust boundary in SonarJS where external payloads
(JSON strings, protobuf messages, optional fields) are converted into validated
internal state. Sanitization happens at entry points so deeper analysis code can
assume normalized paths, initialized file stores, and fully shaped
configuration objects.

## Architecture Diagram

```text
External input
  |
  +-- AnalyzeProjectService (gRPC runtime)
  |     - AnalyzeProject
  |     - AnalyzeProjectUnary
  |     - CancelAnalysis
  |     -> startAnalyzeProjectServer()
  |     -> handleAnalyzeProjectRequest()
  |
  +-- LanguageAnalyzerService (gRPC)
  |     - Analyze
  |     -> analyzeFileHandler()
  |
  `-- CLI (future)
        -> same sanitization layer

Sanitization layer
  - createConfiguration()
  - sanitizeProjectAnalysisInput()
  - sanitizeRawInputFiles()
  - transformRequestToProjectInput()
  - transformSourceFilesToRawInputFiles()
  - normalizeToAbsolutePath()
  - sanitizePaths()

Internal analysis
  - analyzeProject()
  - analyzeJSTS()
  - analyzeCSS()
```

## Entry Points

### 1. Analyze-Project gRPC Runtime

**Location:** `packages/grpc/src/`

| Service                 | Method                | Handler                       |
| ----------------------- | --------------------- | ----------------------------- |
| `AnalyzeProjectService` | `AnalyzeProject`      | `startAnalyzeProjectServer()` |
| `AnalyzeProjectService` | `AnalyzeProjectUnary` | `startAnalyzeProjectServer()` |
| `AnalyzeProjectService` | `CancelAnalysis`      | `startAnalyzeProjectServer()` |

**Sanitization in `handleAnalyzeProjectRequest()`:**

```typescript
const sanitizedInput = await normalizeAnalyzeProjectRequest(request.data);
const wrappedIncrementalResultsChannel = incrementalResultsChannel
  ? event => incrementalResultsChannel({ event, pathMap: sanitizedInput.pathMap })
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
```

`normalizeAnalyzeProjectRequest()` performs the main boundary crossing for the
analyze-project runtime:

- validates the typed gRPC `AnalyzeProjectRequest` payload,
- creates a sanitized `Configuration` via `createConfigurationFromProto()`,
- normalizes project file paths and bundle paths,
- initializes the analysis file stores before `analyzeProject()` runs.

### 2. LanguageAnalyzerService

**Location:** `packages/grpc/src/`

| Service                   | Method    | Handler                |
| ------------------------- | --------- | ---------------------- |
| `LanguageAnalyzerService` | `Analyze` | `analyzeFileHandler()` |

**Sanitization in `analyzeFileHandler()`:**

```typescript
const configuration = createConfiguration({
  baseDir: ROOT_PATH,
  canAccessFileSystem: false,
  reportNclocForTestFiles: true,
});

const rawFiles = transformSourceFilesToRawInputFiles(request.sourceFiles || []);
const { files: inputFiles, pathMap } = await sanitizeRawInputFiles(rawFiles, configuration);
await initFileStores(configuration, inputFiles);

const projectInput = transformRequestToProjectInput(request);
```

This path uses the same sanitization helpers as the analyze-project runtime, but
starts from protobuf request data instead of a JSON payload.

## Type Transformations

### External payloads to sanitized internal state

| External input                               | Internal state                            | Key transformations                                                  |
| -------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Analyze-project gRPC `AnalyzeProjectRequest` | `Configuration` + initialized file stores | `normalizeAnalyzeProjectRequest()`, `createConfigurationFromProto()` |
| gRPC `sourceFiles[]`                         | sanitized analyzable files                | `transformSourceFilesToRawInputFiles()`, `sanitizeRawInputFiles()`   |
| gRPC `activeRules[]`                         | `RuleConfig[]` and `CssRuleConfig[]`      | `transformRequestToProjectInput()`                                   |
| path strings                                 | `NormalizedAbsolutePath`                  | `normalizeToAbsolutePath()`, `sanitizePaths()`                       |
| protobuf configuration fields                | validated `Configuration`                 | `createConfigurationFromProto()`, `createConfigurationFromInput()`   |

### Important boundary details

- The analyze-project runtime stores sanitized files in the shared file stores
  during sanitization. `analyzeProject()` then reads from those stores rather
  than from the original raw payload.
- `LanguageAnalyzerService` receives file contents inline over gRPC, converts
  them into the same raw-file shape, and then reuses `sanitizeRawInputFiles()`.
- Rule transformation stays at the transport edge:
  `transformRequestToProjectInput()` converts protobuf rule payloads into the
  internal JS/TS and CSS rule configuration types expected by analysis.

## Sanitization Functions

### Configuration creation

**Location:** `packages/analysis/src/common/configuration.ts`

```typescript
createConfiguration(raw: unknown): Configuration
```

Responsibilities:

- validates that the incoming value is an object,
- normalizes `baseDir` and path arrays,
- compiles glob-based filters,
- applies defaults for omitted configuration fields.

### Project payload sanitization

**Location:** `packages/analysis/src/common/input-sanitize.ts`

```typescript
sanitizeProjectAnalysisInput(raw: unknown): Promise<SanitizedProjectAnalysisInput>
sanitizeRawInputFiles(rawFiles, configuration): Promise<SanitizedInputFiles>
```

Responsibilities:

- validate raw project payloads,
- normalize file paths and optional `rulesWorkdir`,
- validate file metadata such as `fileType` and `fileStatus`,
- initialize file stores before analysis starts.

### gRPC request transformation

**Location:** `packages/grpc/src/transformers/request.ts`

```typescript
transformSourceFilesToRawInputFiles(sourceFiles);
transformRequestToProjectInput(request);
```

Responsibilities:

- convert protobuf source files into the raw file structure expected by the
  shared sanitization helpers,
- split active rules into JS/TS and CSS rule configurations,
- keep transport-specific translation out of core analysis code.

### Path utilities

**Location:** `packages/shared/src/helpers/files.ts` and
`packages/shared/src/helpers/sanitize.ts`

Key helpers:

- `normalizeToAbsolutePath()`
- `sanitizePaths()`
- `ROOT_PATH`
- `NormalizedAbsolutePath`

## Flow Examples

### Analyze-project runtime

```text
gRPC AnalyzeProject() / AnalyzeProjectUnary()
  requestJson
    -> startAnalyzeProjectServer()
    -> handleAnalyzeProjectRequest()
       -> sanitizeProjectAnalysisInput()
          -> createConfiguration()
          -> sanitizeRawInputFiles()
          -> initFileStores()
       -> analyzeProject()
```

### LanguageAnalyzerService

```text
gRPC Analyze()
  IAnalyzeRequest
    -> analyzeFileHandler()
       -> createConfiguration({ baseDir: ROOT_PATH, canAccessFileSystem: false, ... })
       -> transformSourceFilesToRawInputFiles()
       -> sanitizeRawInputFiles()
       -> initFileStores()
       -> transformRequestToProjectInput()
       -> analyzeProject()
       -> transformProjectOutputToResponse()
```

## Key Principles

### 1. Sanitize at entry points

All sanitization happens in request handlers
(`handleAnalyzeProjectRequest()` and `analyzeFileHandler()`), not in deeper
analysis code.

### 2. Normalize paths once

External paths become `NormalizedAbsolutePath` before internal analysis logic
sees them.

### 3. Initialize file stores before analysis

`analyzeProject()` expects callers to have loaded sanitized files into the file
stores first.

### 4. Keep transport translation at the edges

JSON and protobuf shape conversion belongs in runtime handlers and transformer
code, not in analysis modules.

## Files Reference

| Category        | File                                                  | Purpose                                   |
| --------------- | ----------------------------------------------------- | ----------------------------------------- |
| Entry points    | `packages/grpc/src/analyze-project-server.ts`         | Analyze-project gRPC runtime              |
|                 | `packages/grpc/src/analyze-project-handle-request.ts` | Analyze-project request handling          |
|                 | `packages/grpc/src/service.ts`                        | `LanguageAnalyzerService` handler         |
| Sanitization    | `packages/analysis/src/common/configuration.ts`       | Configuration validation and defaults     |
|                 | `packages/analysis/src/common/input-sanitize.ts`      | Project payload and raw-file sanitization |
| Transport layer | `packages/grpc/src/transformers/request.ts`           | gRPC request transformation               |
| Path utilities  | `packages/shared/src/helpers/files.ts`                | Path normalization helpers                |
|                 | `packages/shared/src/helpers/sanitize.ts`             | Shared path-array sanitization            |
| Internal types  | `packages/analysis/src/projectAnalysis.ts`            | `ProjectAnalysisInput`                    |

## Related Documentation

- [Branded ProgramOptions](./branded-program-options.md)
- [TypeScript Program Creation Guide](./typescript-program-creation-guide.md)
