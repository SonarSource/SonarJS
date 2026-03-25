# Sanitization Boundaries: Raw vs Internal Types

## Overview

This document describes the **trust boundary** in SonarJS where external input (raw strings, optional fields) is transformed into validated internal types (branded paths, required fields). All sanitization happens at well-defined entry points, ensuring internal code can trust its inputs.

## Architecture Diagram

```
                            EXTERNAL INPUT
                                  â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚                             â”‚                             â”‚
    â–¼                             â–¼                             â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”               â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  HTTP   â”‚               â”‚    gRPC      â”‚              â”‚    CLI      â”‚
â”‚ Bridge  â”‚               â”‚   Service    â”‚              â”‚  (future)   â”‚
â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜               â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜              â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
     â”‚                           â”‚                             â”‚
     â”‚ RawConfiguration          â”‚ IAnalyzeRequest             â”‚
     â”‚ RawJsTsAnalysisInput      â”‚ ISourceFile[]               â”‚
     â”‚ RawProjectAnalysisInput   â”‚ IActiveRule[]               â”‚
     â”‚                           â”‚                             â”‚
     â–¼                           â–¼                             â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      SANITIZATION LAYER                            â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚                    Entry Point Functions                      â”‚  â”‚
â”‚  â”‚                                                               â”‚  â”‚
â”‚  â”‚  â€¢ handle-request.ts:handleRequest()      â† HTTP Bridge       â”‚  â”‚
â”‚  â”‚  â€¢ service.ts:analyzeFileHandler()        â† gRPC              â”‚  â”‚
â”‚  â”‚  â€¢ configuration.ts:setGlobalConfiguration()                  â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                              â”‚                                     â”‚
â”‚                              â–¼                                     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚                  Sanitization Functions                       â”‚  â”‚
â”‚  â”‚                                                               â”‚  â”‚
â”‚  â”‚  Path Normalization:                                          â”‚  â”‚
â”‚  â”‚    â€¢ normalizeToAbsolutePath(string) â†’ NormalizedAbsolutePath â”‚  â”‚
â”‚  â”‚    â€¢ sanitizePaths(string[]) â†’ NormalizedAbsolutePath[]       â”‚  â”‚
â”‚  â”‚                                                               â”‚  â”‚
â”‚  â”‚  Input Sanitization:                                          â”‚  â”‚
â”‚  â”‚    â€¢ sanitizeAnalysisInput() â†’ AnalysisInput                  â”‚  â”‚
â”‚  â”‚    â€¢ sanitizeJsTsAnalysisInput() â†’ JsTsAnalysisInput          â”‚  â”‚
â”‚  â”‚                                                               â”‚  â”‚
â”‚  â”‚  Glob Compilation:                                            â”‚  â”‚
â”‚  â”‚    â€¢ normalizeGlobs(string[]) â†’ Minimatch[]                   â”‚  â”‚
â”‚  â”‚                                                               â”‚  â”‚
â”‚  â”‚  gRPC Transformation:                                         â”‚  â”‚
â”‚  â”‚    â€¢ transformRequestToProjectInput() â†’ ProjectAnalysisInput  â”‚  â”‚
â”‚  â”‚    â€¢ transformSourceFiles() â†’ JsTsFiles                       â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â”‚ Configuration (global state)
                              â”‚ AnalysisInput / JsTsAnalysisInput
                              â”‚ ProjectAnalysisInput
                              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        INTERNAL ANALYSIS                           â”‚
â”‚                                                                    â”‚
â”‚   All paths: NormalizedAbsolutePath (branded)                      â”‚
â”‚   All fields: Required with defaults                               â”‚
â”‚   All globs: Compiled Minimatch objects                            â”‚
â”‚                                                                    â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  analyzeCSS  â”‚  â”‚ analyzeJSTS  â”‚  â”‚    analyzeProject        â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚          â”‚                 â”‚                      â”‚                â”‚
â”‚          â–¼                 â–¼                      â–¼                â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚                    Internal Components                        â”‚  â”‚
â”‚  â”‚                                                               â”‚  â”‚
â”‚  â”‚  â€¢ Linter (expects NormalizedAbsolutePath)                    â”‚  â”‚
â”‚  â”‚  â€¢ Parser (expects sanitized input)                           â”‚  â”‚
â”‚  â”‚  â€¢ Rules (trust all paths are normalized)                     â”‚  â”‚
â”‚  â”‚  â€¢ File stores (use branded JsTsFiles)                        â”‚  â”‚
â”‚  â”‚  â€¢ Package.json helpers (use NormalizedAbsolutePath)          â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Entry Points

### 1. HTTP Bridge

**Location:** `packages/http/src/`

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
//    â””â”€ transformSourceFiles() normalizes all paths
//    â””â”€ transformActiveRules() parses string params to typed values

// 3. Run analysis with sanitized input
return analyzeProject(projectInput);
```

## Type Transformations

### Raw Types â†’ Sanitized Types

| Raw Type                  | Sanitized Type         | Key Transformations                                                        |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `RawConfiguration`        | `Configuration`        | `baseDir: string` â†’ `NormalizedAbsolutePath`, globs â†’ `Minimatch[]`    |
| `RawAnalysisInput`        | `AnalysisInput`        | `filePath: string` â†’ `NormalizedAbsolutePath`, optional â†’ required     |
| `RawJsTsAnalysisInput`    | `JsTsAnalysisInput`    | + `tsConfigs: string[]` â†’ `NormalizedAbsolutePath[]`, language inference |
| `RawProjectAnalysisInput` | `ProjectAnalysisInput` | `files` â†’ `JsTsFiles` (branded), all paths normalized                    |
| `IAnalyzeRequest` (gRPC)  | `ProjectAnalysisInput` | protobuf â†’ TypeScript types, path normalization                          |

### Field Transformations

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        RAW INPUT                                    â”‚
â”‚                                                                     â”‚
â”‚  filePath: string              â”€â”¬â”€â–º  NormalizedAbsolutePath         â”‚
â”‚  baseDir: string               â”€â”¤    (Unix slashes, absolute)       â”‚
â”‚  tsConfigs: string[]           â”€â”¤                                   â”‚
â”‚  bundles: string[]             â”€â”˜                                   â”‚
â”‚                                                                     â”‚
â”‚  fileContent?: string          â”€â”€â”€â–º  string (read from disk)        â”‚
â”‚  sonarlint?: boolean           â”€â”€â”€â–º  boolean (default: false)       â”‚
â”‚  language?: 'js' | 'ts'        â”€â”€â”€â–º  'js' | 'ts' (inferred)         â”‚
â”‚  fileType?: FileType           â”€â”€â”€â–º  FileType (inferred from path)  â”‚
â”‚                                                                     â”‚
â”‚  jsTsExclusions?: string[]     â”€â”€â”€â–º  Minimatch[] (compiled)         â”‚
â”‚  inclusions?: string[]         â”€â”€â”€â–º  Minimatch[] (compiled)         â”‚
â”‚                                                                     â”‚
â”‚  params: {key,value}[] (gRPC)  â”€â”€â”€â–º  typed values (number, bool)    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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
// âŒ This will NOT compile
function analyzeFile(path: NormalizedAbsolutePath) { ... }
analyzeFile("./src/foo.ts");  // Error: string not assignable to NormalizedAbsolutePath

// âœ… Must go through normalization
const normalizedPath = normalizeToAbsolutePath("./src/foo.ts", baseDir);
analyzeFile(normalizedPath);  // OK
```

## Sanitization Functions

### Path Normalization

**Location:** `packages/analysis/jsts/src/rules/helpers/files.ts`

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

**Location:** `packages/analysis/src/common/input-sanitize.ts`

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

**Location:** `packages/analysis/src/common/configuration.ts`

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
    â”‚
    â”‚  { filePath: "src\\foo.ts", fileContent: "..." }
    â”‚
    â–¼
handleRequest()
    â”œâ”€â”€ resolveBaseDir() â†’ NormalizedAbsolutePath
    â””â”€â”€ sanitizeJsTsAnalysisInput()
            â”œâ”€â”€ normalizeToAbsolutePath(filePath)
            â”œâ”€â”€ inferLanguage() â†’ 'ts'
            â”œâ”€â”€ inferFileType() â†’ 'MAIN'
            â””â”€â”€ apply defaults
    â”‚
    â”‚  JsTsAnalysisInput {
    â”‚    filePath: NormalizedAbsolutePath,
    â”‚    fileContent: string,
    â”‚    language: 'ts',
    â”‚    fileType: 'MAIN',
    â”‚    ... (all required)
    â”‚  }
    â”‚
    â–¼
analyzeJSTS() â†’ JsTsAnalysisOutput
```

### Project Analysis

```
HTTP POST /analyze-project
    â”‚
    â”‚  {
    â”‚    configuration: { baseDir: "C:\\project", ... },
    â”‚    files: { "src\\foo.ts": {...}, ... },
    â”‚    bundles: ["node_modules\\lib"]
    â”‚  }
    â”‚
    â–¼
handleRequest()
    â”œâ”€â”€ setGlobalConfiguration()
    â”‚       â”œâ”€â”€ normalizeToAbsolutePath(baseDir)
    â”‚       â”œâ”€â”€ sanitizePaths(tsConfigPaths)
    â”‚       â””â”€â”€ normalizeGlobs(exclusions)
    â”‚
    â”œâ”€â”€ getFilesToAnalyze()
    â”‚       â””â”€â”€ normalize all file paths in 'files'
    â”‚
    â””â”€â”€ sanitizePaths(bundles)
    â”‚
    â”‚  ProjectAnalysisInput {
    â”‚    filesToAnalyze: JsTsFiles (branded),
    â”‚    bundles: NormalizedAbsolutePath[],
    â”‚    ... (all sanitized)
    â”‚  }
    â”‚
    â–¼
analyzeProject() â†’ ProjectAnalysisOutput
```

### gRPC Analysis

```
gRPC Analyze()
    â”‚
    â”‚  IAnalyzeRequest {
    â”‚    sourceFiles: [{ relativePath: "src/foo.ts", content: "..." }],
    â”‚    activeRules: [{ ruleKey: "S100", params: [{key:"max",value:"10"}] }]
    â”‚  }
    â”‚
    â–¼
analyzeFileHandler()
    â”œâ”€â”€ setGlobalConfiguration({ baseDir: ROOT_PATH, canAccessFileSystem: false })
    â”‚
    â””â”€â”€ transformRequestToProjectInput()
            â”œâ”€â”€ transformSourceFiles()
            â”‚       â””â”€â”€ normalizeToAbsolutePath(relativePath)
            â”‚
            â””â”€â”€ transformActiveRules()
                    â””â”€â”€ parseParamValue() â†’ number/boolean/array
    â”‚
    â”‚  ProjectAnalysisInput (sanitized)
    â”‚
    â–¼
analyzeProject() â†’ ProjectAnalysisOutput
    â”‚
    â–¼
transformProjectOutputToResponse() â†’ gRPC IAnalyzeResponse
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
// âŒ Wrong - redundant normalization
const path = normalizeToAbsolutePath(Linter.baseDir); // Already branded!

// âœ… Correct - use directly
const path = Linter.baseDir;
```

### 4. Type-Safe Path Operations

Use wrapper functions that preserve branded types:

```typescript
// âŒ Wrong - loses branded type
const parent = dirname(filePath) as NormalizedAbsolutePath;

// âœ… Correct - type-safe wrapper
const parent = dirnamePath(filePath); // Returns NormalizedAbsolutePath
```

## Files Reference

| Category         | File                                                | Purpose                       |
| ---------------- | --------------------------------------------------- | ----------------------------- |
| Entry Points     | `packages/http/src/handle-request.ts`               | HTTP request handling         |
|                  | `packages/grpc/src/service.ts`                      | gRPC request handling         |
| Sanitization     | `packages/analysis/src/common/input-sanitize.ts`    | Input sanitization functions  |
|                  | `packages/analysis/src/common/configuration.ts`     | Configuration sanitization    |
|                  | `packages/grpc/src/transformers/request.ts`         | gRPC request transformation   |
| Path Utilities   | `packages/analysis/jsts/src/rules/helpers/files.ts` | Branded types & normalization |
| Type Definitions | `packages/analysis/src/contracts/analysis.ts`       | Raw & sanitized input types   |
|                  | `packages/http/src/request.ts`                      | Bridge request types          |

## Related Documentation

- [Branded ProgramOptions](./branded-program-options.md) - Similar pattern for TypeScript program creation
- [TypeScript Program Creation Guide](./typescript-program-creation-guide.md) - How TypeScript programs are created and managed
