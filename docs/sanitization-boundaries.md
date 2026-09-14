# Sanitization Boundaries: Protobuf To Internal Types

## Overview

The `AnalyzeProjectService` gRPC boundary converts generated protobuf messages into normalized
internal state. Sanitization happens before analysis so deeper code can assume normalized paths,
initialized file stores, validated rule configurations, and a fully shaped `Configuration`.

## Architecture

```text
AnalyzeProjectService (gRPC)
  - AnalyzeProject
  - AnalyzeProjectUnary
  - CancelAnalysis
  |
  v
startAnalyzeProjectServer()
  |
  v
handleAnalyzeProjectRequest()
  |
  v
normalizeAnalyzeProjectRequest()
  - createConfigurationFromProto()
  - normalizeProtoInputFiles()
  - sanitizeInputFiles()
  - normalizeJsTsRules() / normalizeCssRules()
  - initFileStoresForAnalysis()
  |
  v
analyzeProject()
```

## Entry Point

**Location:** `packages/grpc/src/`

| Service                 | Method                | Handler                       |
| ----------------------- | --------------------- | ----------------------------- |
| `AnalyzeProjectService` | `AnalyzeProject`      | `startAnalyzeProjectServer()` |
| `AnalyzeProjectService` | `AnalyzeProjectUnary` | `startAnalyzeProjectServer()` |
| `AnalyzeProjectService` | `CancelAnalysis`      | `startAnalyzeProjectServer()` |

Both analysis RPCs eventually call `handleAnalyzeProjectRequest()`, which crosses the boundary
through `normalizeAnalyzeProjectRequest()`:

```typescript
const sanitizedInput = await normalizeAnalyzeProjectRequest(request.data);
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

The cancellation RPC does not carry project input and therefore does not cross this sanitization
boundary.

## Type Transformations

| Protobuf input                        | Internal state                  | Main transformation                                     |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `ProjectConfiguration`                | validated `Configuration`       | `createConfigurationFromProto()`                        |
| `map<string, ProjectFileInput> files` | sanitized analyzable files      | `normalizeProtoInputFiles()` and `sanitizeInputFiles()` |
| `repeated JsTsRule rules`             | `RuleConfig[]`                  | `normalizeJsTsRules()`                                  |
| `repeated CssRule css_rules`          | CSS `RuleConfig[]`              | `normalizeCssRules()`                                   |
| path strings and map keys             | `NormalizedAbsolutePath`        | path normalization helpers                              |
| protobuf `Value` configurations       | JavaScript configuration values | protobuf-value conversion                               |

`normalizeAnalyzeProjectRequest()` also:

- requires an absolute `configuration.base_dir`,
- applies configuration defaults and validates scalar values,
- reads file contents from disk when the request omits them and filesystem access is allowed,
- infers file types when needed and defaults omitted file status to `SAME`,
- normalizes bundle paths, `rules_workdir`, tsconfig paths, filesystem events, and file-map keys,
- applies file filters and initializes the shared file stores before analysis.

## Sanitization Functions

### Configuration creation

**Locations:** `packages/grpc/src/analyze-project-normalize.ts` and
`packages/analysis/src/common/configuration.ts`

`createConfigurationFromProto()` converts protobuf presence and enum semantics into a
`ConfigurationInput`. `createConfigurationFromInput()` then validates and normalizes the complete
configuration.

### File sanitization

**Location:** `packages/analysis/src/common/input-sanitize.ts`

```typescript
sanitizeInputFiles(inputFiles, configuration): Promise<SanitizedInputFiles>
```

Responsibilities:

- normalize file paths relative to `baseDir`,
- read omitted contents from disk,
- infer main/test classification where configuration provides a stronger answer,
- apply ignore filtering,
- build the normalized file map and the response path map.

### Request normalization

**Location:** `packages/grpc/src/analyze-project-normalize.ts`

Transport-specific validation and conversion remains at this edge. It covers protobuf enum
handling, optional fields, numeric conversion, rule configuration values, file-map keys, and path
lists. Core analysis code does not depend on protobuf message shapes.

## Key Principles

1. Sanitize once at the gRPC entry point, before calling analysis code.
2. Convert paths to `NormalizedAbsolutePath` before internal consumers see them.
3. Initialize file stores before `analyzeProject()` reads them.
4. Keep protobuf translation in `packages/grpc`, outside analysis modules.
5. Preserve typed rule configuration values across the Java-to-Node boundary.

## Files Reference

| Category        | File                                                  | Purpose                           |
| --------------- | ----------------------------------------------------- | --------------------------------- |
| Server          | `packages/grpc/src/analyze-project-server.ts`         | Analyze-project gRPC runtime      |
| Request handler | `packages/grpc/src/analyze-project-handle-request.ts` | Analysis dispatch                 |
| Normalization   | `packages/grpc/src/analyze-project-normalize.ts`      | Protobuf-to-internal boundary     |
| Sanitization    | `packages/analysis/src/common/configuration.ts`       | Configuration validation/defaults |
| Sanitization    | `packages/analysis/src/common/input-sanitize.ts`      | File normalization and filtering  |
| File stores     | `packages/analysis/src/file-stores/index.ts`          | Per-analysis initialization       |
| Internal types  | `packages/analysis/src/projectAnalysis.ts`            | Project analysis input/output     |

## Related Documentation

- [gRPC Analyze-Project Migration](./grpc-analyze-project-migration.md)
- [Node.js Analysis Caches And File Stores](./node-analysis-caches.md)
- [Branded ProgramOptions](./branded-program-options.md)
- [TypeScript Program Creation Guide](./typescript-program-creation-guide.md)
