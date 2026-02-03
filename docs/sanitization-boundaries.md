# Sanitization Boundaries: Raw vs Internal Types

## Overview

This document describes the **trust boundary** in SonarJS where external input (raw strings, optional fields) is transformed into validated internal types (branded paths, required fields). All sanitization happens at well-defined entry points, ensuring internal code can trust its inputs.

## Architecture Diagram

```
                            EXTERNAL INPUT
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
┌─────────┐               ┌──────────────┐              ┌─────────────┐
│  HTTP   │               │    gRPC      │              │    CLI      │
│ Bridge  │               │   Service    │              │  (future)   │
└────┬────┘               └──────┬───────┘              └──────┬──────┘
     │                           │                             │
     │ RawConfiguration          │ IAnalyzeRequest             │
     │ RawJsTsAnalysisInput      │ ISourceFile[]               │
     │ RawProjectAnalysisInput   │ IActiveRule[]               │
     │                           │                             │
     ▼                           ▼                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                      SANITIZATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Entry Point Functions                      │  │
│  │                                                               │  │
│  │  • handle-request.ts:handleRequest()      ← HTTP Bridge       │  │
│  │  • service.ts:analyzeFileHandler()        ← gRPC              │  │
│  │  • configuration.ts:setGlobalConfiguration()                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                     │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Sanitization Functions                       │  │
│  │                                                               │  │
│  │  Path Normalization:                                          │  │
│  │    • normalizeToAbsolutePath(string) → NormalizedAbsolutePath │  │
│  │    • sanitizePaths(string[]) → NormalizedAbsolutePath[]       │  │
│  │                                                               │  │
│  │  Input Sanitization:                                          │  │
│  │    • sanitizeAnalysisInput() → AnalysisInput                  │  │
│  │    • sanitizeJsTsAnalysisInput() → JsTsAnalysisInput          │  │
│  │                                                               │  │
│  │  Glob Compilation:                                            │  │
│  │    • normalizeGlobs(string[]) → Minimatch[]                   │  │
│  │                                                               │  │
│  │  gRPC Transformation:                                         │  │
│  │    • transformRequestToProjectInput() → ProjectAnalysisInput  │  │
│  │    • transformSourceFiles() → JsTsFiles                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ Configuration (global state)
                              │ AnalysisInput / JsTsAnalysisInput
                              │ ProjectAnalysisInput
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                        INTERNAL ANALYSIS                           │
│                                                                    │
│   All paths: NormalizedAbsolutePath (branded)                      │
│   All fields: Required with defaults                               │
│   All globs: Compiled Minimatch objects                            │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  analyzeCSS  │  │ analyzeJSTS  │  │    analyzeProject        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│          │                 │                      │                │
│          ▼                 ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Internal Components                        │  │
│  │                                                               │  │
│  │  • Linter (expects NormalizedAbsolutePath)                    │  │
│  │  • Parser (expects sanitized input)                           │  │
│  │  • Rules (trust all paths are normalized)                     │  │
│  │  • File stores (use branded JsTsFiles)                        │  │
│  │  • Package.json helpers (use NormalizedAbsolutePath)          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Entry Points

### 1. HTTP Bridge

**Location:** `packages/bridge/src/`

| Endpoint                | Request Type               | Handler           |
| ----------------------- | -------------------------- | ----------------- |
| `POST /init-linter`     | `RawInitLinterInput`       | `handleRequest()` |
| `POST /analyze-jsts`    | `RawJsTsAnalysisInput`     | `handleRequest()` |
| `POST /analyze-css`     | `RawCssAnalysisInput`      | `handleRequest()` |
| `POST /analyze-html`    | `RawEmbeddedAnalysisInput` | `handleRequest()` |
| `POST /analyze-yaml`    | `RawEmbeddedAnalysisInput` | `handleRequest()` |
| `POST /analyze-project` | `RawProjectAnalysisInput`  | `handleRequest()` |

**Sanitization in `handleRequest()`:**

```typescript
// 1. Resolve and normalize base directory
const baseDir = resolveBaseDir(filePath, configuration);

// 2. Set global configuration (sanitizes all paths internally)
setGlobalConfiguration(configuration);

// 3. Sanitize analysis input
const input = await sanitizeJsTsAnalysisInput(rawInput, baseDir);

// 4. Call internal analysis with sanitized input
return analyzeJSTS(input);
```

### 2. gRPC Service

**Location:** `packages/grpc/src/`

| Service                   | Method    | Handler                |
| ------------------------- | --------- | ---------------------- |
| `LanguageAnalyzerService` | `Analyze` | `analyzeFileHandler()` |

**Sanitization in `analyzeFileHandler()`:**

```typescript
// 1. Set configuration (gRPC runs without filesystem access)
setGlobalConfiguration({ baseDir: ROOT_PATH, canAccessFileSystem: false });

// 2. Transform protobuf request to internal types
const projectInput = transformRequestToProjectInput(request);
//    └─ transformSourceFiles() normalizes all paths
//    └─ transformActiveRules() parses string params to typed values

// 3. Run analysis with sanitized input
return analyzeProject(projectInput);
```

## Type Transformations

### Raw Types → Sanitized Types

| Raw Type                  | Sanitized Type         | Key Transformations                                                      |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `RawConfiguration`        | `Configuration`        | `baseDir: string` → `NormalizedAbsolutePath`, globs → `Minimatch[]`      |
| `RawAnalysisInput`        | `AnalysisInput`        | `filePath: string` → `NormalizedAbsolutePath`, optional → required       |
| `RawJsTsAnalysisInput`    | `JsTsAnalysisInput`    | + `tsConfigs: string[]` → `NormalizedAbsolutePath[]`, language inference |
| `RawProjectAnalysisInput` | `ProjectAnalysisInput` | `files` → `JsTsFiles` (branded), all paths normalized                    |
| `IAnalyzeRequest` (gRPC)  | `ProjectAnalysisInput` | protobuf → TypeScript types, path normalization                          |

### Field Transformations

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAW INPUT                                    │
│                                                                     │
│  filePath: string              ─┬─►  NormalizedAbsolutePath         │
│  baseDir: string               ─┤    (Unix slashes, absolute)       │
│  tsConfigs: string[]           ─┤                                   │
│  bundles: string[]             ─┘                                   │
│                                                                     │
│  fileContent?: string          ───►  string (read from disk)        │
│  sonarlint?: boolean           ───►  boolean (default: false)       │
│  language?: 'js' | 'ts'        ───►  'js' | 'ts' (inferred)         │
│  fileType?: FileType           ───►  FileType (inferred from path)  │
│                                                                     │
│  jsTsExclusions?: string[]     ───►  Minimatch[] (compiled)         │
│  inclusions?: string[]         ───►  Minimatch[] (compiled)         │
│                                                                     │
│  params: {key,value}[] (gRPC)  ───►  typed values (number, bool)    │
└─────────────────────────────────────────────────────────────────────┘
```

## Branded Types

### What Are Branded Types?

Branded types use TypeScript's type system to create distinct types that are structurally identical to strings but treated as incompatible:

```typescript
declare const NormalizedAbsolutePathBrand: unique symbol;
export type NormalizedAbsolutePath = string & {
  readonly [NormalizedAbsolutePathBrand]: never;
};
```

**At runtime:** Branded paths are regular strings (zero overhead)
**At compile time:** TypeScript prevents passing raw strings where branded types are expected

### Path Types

| Type                     | Description                      | Example                                    |
| ------------------------ | -------------------------------- | ------------------------------------------ |
| `NormalizedPath`         | Unix-normalized, may be relative | `./src/foo.ts`                             |
| `NormalizedAbsolutePath` | Unix-normalized AND absolute     | `/home/user/src/foo.ts`, `C:/Users/foo.ts` |

### Why This Matters

```typescript
// ❌ This will NOT compile
function analyzeFile(path: NormalizedAbsolutePath) { ... }
analyzeFile("./src/foo.ts");  // Error: string not assignable to NormalizedAbsolutePath

// ✅ Must go through normalization
const normalizedPath = normalizeToAbsolutePath("./src/foo.ts", baseDir);
analyzeFile(normalizedPath);  // OK
```

## Sanitization Functions

### Path Normalization

**Location:** `packages/jsts/src/rules/helpers/files.ts`

```typescript
// Convert any path to Unix-normalized absolute path
normalizeToAbsolutePath(filePath: string, baseDir?: NormalizedAbsolutePath): NormalizedAbsolutePath

// Normalize array of paths
sanitizePaths(paths: string[], baseDir: NormalizedAbsolutePath): NormalizedAbsolutePath[]

// Type-safe path operations (preserve branded type)
dirnamePath(filePath: NormalizedAbsolutePath): NormalizedAbsolutePath
joinPaths(base: NormalizedAbsolutePath, ...segments: string[]): NormalizedAbsolutePath
```

### Input Sanitization

**Location:** `packages/shared/src/helpers/sanitize.ts`

```typescript
// Sanitize base analysis input
async function sanitizeAnalysisInput(
  raw: RawAnalysisInput,
  baseDir: NormalizedAbsolutePath,
): Promise<AnalysisInput>;

// Sanitize JS/TS analysis input (includes language inference)
async function sanitizeJsTsAnalysisInput(
  raw: RawJsTsAnalysisInput,
  baseDir: NormalizedAbsolutePath,
): Promise<JsTsAnalysisInput>;
```

### Configuration Sanitization

**Location:** `packages/shared/src/helpers/configuration.ts`

```typescript
// Set and sanitize global configuration
function setGlobalConfiguration(config?: RawConfiguration): void;
// Internally:
//   - normalizeToAbsolutePath(baseDir)
//   - sanitizePaths(tsConfigPaths, sources, tests)
//   - normalizeGlobs(jsTsExclusions, inclusions, exclusions)
//   - normalizeFsEvents(fsEvents)
```

## Flow Examples

### Single-File JS/TS Analysis

```
HTTP POST /analyze-jsts
    │
    │  { filePath: "src\\foo.ts", fileContent: "..." }
    │
    ▼
handleRequest()
    ├── resolveBaseDir() → NormalizedAbsolutePath
    └── sanitizeJsTsAnalysisInput()
            ├── normalizeToAbsolutePath(filePath)
            ├── inferLanguage() → 'ts'
            ├── inferFileType() → 'MAIN'
            └── apply defaults
    │
    │  JsTsAnalysisInput {
    │    filePath: NormalizedAbsolutePath,
    │    fileContent: string,
    │    language: 'ts',
    │    fileType: 'MAIN',
    │    ... (all required)
    │  }
    │
    ▼
analyzeJSTS() → JsTsAnalysisOutput
```

### Project Analysis

```
HTTP POST /analyze-project
    │
    │  {
    │    configuration: { baseDir: "C:\\project", ... },
    │    files: { "src\\foo.ts": {...}, ... },
    │    bundles: ["node_modules\\lib"]
    │  }
    │
    ▼
handleRequest()
    ├── setGlobalConfiguration()
    │       ├── normalizeToAbsolutePath(baseDir)
    │       ├── sanitizePaths(tsConfigPaths)
    │       └── normalizeGlobs(exclusions)
    │
    ├── getFilesToAnalyze()
    │       └── normalize all file paths in 'files'
    │
    └── sanitizePaths(bundles)
    │
    │  ProjectAnalysisInput {
    │    filesToAnalyze: JsTsFiles (branded),
    │    bundles: NormalizedAbsolutePath[],
    │    ... (all sanitized)
    │  }
    │
    ▼
analyzeProject() → ProjectAnalysisOutput
```

### gRPC Analysis

```
gRPC Analyze()
    │
    │  IAnalyzeRequest {
    │    sourceFiles: [{ relativePath: "src/foo.ts", content: "..." }],
    │    activeRules: [{ ruleKey: "S100", params: [{key:"max",value:"10"}] }]
    │  }
    │
    ▼
analyzeFileHandler()
    ├── setGlobalConfiguration({ baseDir: ROOT_PATH, canAccessFileSystem: false })
    │
    └── transformRequestToProjectInput()
            ├── transformSourceFiles()
            │       └── normalizeToAbsolutePath(relativePath)
            │
            └── transformActiveRules()
                    └── parseParamValue() → number/boolean/array
    │
    │  ProjectAnalysisInput (sanitized)
    │
    ▼
analyzeProject() → ProjectAnalysisOutput
    │
    ▼
transformProjectOutputToResponse() → gRPC IAnalyzeResponse
```

## Key Principles

### 1. Sanitize at Entry Points

All sanitization happens in request handlers (`handleRequest`, `analyzeFileHandler`), **not** scattered throughout the codebase.

### 2. Internal Code Trusts Its Inputs

Once past the sanitization layer, internal functions can assume:

- All paths are `NormalizedAbsolutePath`
- All required fields are present
- All values have correct types

### 3. No Double Sanitization

If a value is already a branded type, don't normalize it again:

```typescript
// ❌ Wrong - redundant normalization
const path = normalizeToAbsolutePath(Linter.baseDir); // Already branded!

// ✅ Correct - use directly
const path = Linter.baseDir;
```

### 4. Type-Safe Path Operations

Use wrapper functions that preserve branded types:

```typescript
// ❌ Wrong - loses branded type
const parent = dirname(filePath) as NormalizedAbsolutePath;

// ✅ Correct - type-safe wrapper
const parent = dirnamePath(filePath); // Returns NormalizedAbsolutePath
```

## Files Reference

| Category         | File                                           | Purpose                       |
| ---------------- | ---------------------------------------------- | ----------------------------- |
| Entry Points     | `packages/bridge/src/handle-request.ts`        | HTTP request handling         |
|                  | `packages/grpc/src/service.ts`                 | gRPC request handling         |
| Sanitization     | `packages/shared/src/helpers/sanitize.ts`      | Input sanitization functions  |
|                  | `packages/shared/src/helpers/configuration.ts` | Configuration sanitization    |
|                  | `packages/grpc/src/transformers/request.ts`    | gRPC request transformation   |
| Path Utilities   | `packages/jsts/src/rules/helpers/files.ts`     | Branded types & normalization |
| Type Definitions | `packages/shared/src/types/analysis.ts`        | Raw & sanitized input types   |
|                  | `packages/bridge/src/request.ts`               | Bridge request types          |

## Related Documentation

- [Branded ProgramOptions](./branded-program-options.md) - Similar pattern for TypeScript program creation
- [TypeScript Program Creation Guide](./typescript-program-creation-guide.md) - How TypeScript programs are created and managed
