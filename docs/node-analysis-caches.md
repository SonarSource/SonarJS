# Node.js Analysis Caches And File Stores

This document describes the Node.js-side caches used by `analyzeProject`.

It is the cross-layer companion to more focused notes such as [SonarQube Sensor Cache](./sonar-cache.md). The goal here is to explain how file discovery, tsconfig discovery, dependency-manifest lookups, request-file overrides, and TypeScript program reuse fit together inside the Node analyzer.

## Scope

This document covers the Node-side layers under:

- `packages/analysis/src/file-stores/*`
- `packages/analysis/src/jsts/program/*`
- `packages/analysis/src/jsts/program/cache/*`
- `packages/analysis/src/jsts/rules/helpers/dependency-manifests/*`
- `packages/analysis/src/analyzeProject.ts`
- `packages/analysis/src/analyzeWithProgram.ts`
- `packages/analysis/src/analyzeWithIncrementalProgram.ts`
- `packages/analysis/src/common/input-sanitize.ts`
- `packages/grpc/src/analyze-project-normalize.ts`
- `packages/grpc/src/service.ts`

It does not describe:

- the SonarQube scanner-side sensor cache
- issue persistence on the server side
- CSS, HTML, or YAML analysis internals except where they share the same project-input pipeline

## Why This Exists

The Node analyzer needs more than "the current file contents".

For JS/TS analysis it also needs:

- the current analyzable file set
- the current in-memory contents for explicitly provided request files
- the set of usable `tsconfig.json` files
- dependency manifests such as `package.json`, `deno.json`, `deno.jsonc`, and `pnpm-workspace.yaml`
- precomputed "find closest manifest / find manifests in parents" relationships
- cached TypeScript program state
- cached parsed `SourceFile` ASTs

These concerns change for different reasons, so they are not cached as one large blob.

## Layer Overview

There are three Node-side cache layers that are easy to confuse:

| Layer | Main files | Owns | Typical consumer |
| --- | --- | --- | --- |
| File-store layer | `file-stores/*` | discovered source files, tsconfigs, raw manifest contents, directory indexes | project-input normalization and analysis entrypoints |
| TypeScript program/cache layer | `jsts/program/*`, `jsts/program/cache/*` | parsed tsconfig content, computed `ProgramOptions`, builder programs, cached file contents, parsed TS ASTs | `analyzeWithProgram`, `analyzeWithIncrementalProgram`, compiler host |
| Dependency-helper cache layer | `jsts/rules/helpers/dependency-manifests/*` | nearest-manifest caches, manifest-in-parents caches, parsed manifests, derived dependency maps, module-type signals | rules, module-type detection, ECMAScript/lib resolution |

The most important naming distinction is:

- `sourceFileStore` is the file-store singleton under `file-stores/source-files.ts`
- `sourceFileCache` is the compiler-side cache in `jsts/program/cache/sourceFileCache.ts`

They are related, but they do not own the same data and they do not have the same invalidation rules.

## The Three File Stores

`packages/analysis/src/file-stores/index.ts` exports three singleton stores:

- `sourceFileStore`
- `dependencyManifestStore`
- `tsConfigStore`

They are initialized through `initFileStores(configuration, inputFiles?)`.

### Summary Table

| Store | What it owns | How it is populated | Main invalidation |
| --- | --- | --- | --- |
| `sourceFileStore` | analyzable files, file contents, file types, file statuses, ignored dirs, `DirectoryIndex` | filesystem walk or explicit request files | `baseDir` change, or direct reseeding from `inputFiles` |
| `dependencyManifestStore` | raw preloadable manifest contents plus directory-parent graph | filesystem walk or simulated traversal from request files | `baseDir` change, manifest-shaped `fsEvents` |
| `tsConfigStore` | discovered `tsconfig.json` files and provided `tsConfigPaths` matches | filesystem walk or simulated traversal from request files | `baseDir` change, `tsConfigPaths` change, `clearTsConfigCache`, relevant `fsEvents` |

### `sourceFileStore`

`SourceFileStore` owns the analyzable file set that `analyzeProject()` eventually consumes.

It stores:

- the normalized file map returned by `getFiles()`
- file content for request-provided files and for files read during discovery
- file type and file status
- a `DirectoryIndex` used by the no-filesystem tsconfig path
- ignored directories derived from path filtering

Two usage patterns matter:

- Filesystem-driven analysis:
  `findFiles()` walks the project tree and `SourceFileStore.processFile()` decides whether a file belongs in the analyzable set.
- Request-driven analysis:
  `SourceFileStore.isInitialized()` directly replaces the current file map with the sanitized `inputFiles` for the request and rebuilds the `DirectoryIndex`.

That second behavior is important: explicit request files are authoritative. The store does not merge them with an older analyzable file set.

### `tsConfigStore`

`TsConfigStore` owns the set of `tsconfig.json` files that the analysis is allowed to use.

It tracks two sources:

- lookup-discovered `tsconfig.json` files found while traversing the project tree
- user-provided `sonar.typescript.tsconfigPaths` matches

It also owns the policy decision between those two sets:

- if property-provided matches exist, they win
- otherwise lookup-discovered tsconfigs are used

The store is also responsible for clearing downstream TypeScript caches when tsconfig discovery becomes stale.

### `dependencyManifestStore`

`DependencyManifestStore` preloads raw manifest contents and builds the directory ancestry graph needed by the dependency-helper layer.

It stores:

- raw contents of preloadable manifests
- a map from directory to parent directory

It intentionally stores raw file contents rather than parsed manifest objects. Parsing is deferred to the dependency-helper layer, which keeps its own parsed-manifest caches keyed by file path.

After traversal, `postProcess()` calls `fillManifestCaches()` to warm the "closest manifest" and "manifests in parents" caches used by the rest of the analyzer.

## Initialization Flow

All project-style entrypoints go through the same basic sequence:

1. Build a normalized `Configuration`.
2. Sanitize explicit request files if they were provided.
3. Call `initFileStores(configuration, inputFiles?)`.
4. Read the final analyzable file set from `sourceFileStore`.
5. Seed compiler-side request context with `setSourceFilesContext(filesToAnalyze)`.
6. Analyze with:
   - `analyzeWithIncrementalProgram()` for SonarLint / IDE mode
   - `analyzeWithProgram()` for SonarQube full-project mode
   - `analyzeWithoutProgram()` for files that are not covered by any TypeScript program

The main entrypoints are:

- `sanitizeProjectAnalysisInput()` in `packages/analysis/src/common/input-sanitize.ts`
- `normalizeAnalyzeProjectRequest()` in `packages/grpc/src/analyze-project-normalize.ts`

One additional nuance in `normalizeAnalyzeProjectRequest()`:

- when the request has no explicit files and filesystem access is enabled, it explicitly resets the three file stores before rediscovering the project from disk

There is also a standalone gRPC path in `packages/grpc/src/service.ts` that always resets the shared caches before analyzing an inline virtual project rooted at `/`.

## How `initFileStores()` Works

`initFileStores()` does four things:

1. Ask each store whether it is already initialized for the current request.
2. Collect only the stores that still need work.
3. Populate those stores either by walking the real filesystem or by simulating a walk from explicit request files.
4. Run each refreshed store's `postProcess()` hook.

This means the file-store layer is not recomputed eagerly on every call. Each store decides for itself when its current state is still valid.

### Population Mode 1: Real Filesystem Traversal

When `configuration.canAccessFileSystem === true`, `initFileStores()` walks `baseDir` with `findFiles()`.

For every entry:

- directories go through `processDirectory()`
- files go through `processFile()`

The walk is intentionally broader than the final analyzable source-file set because it also needs to discover:

- `tsconfig.json`
- dependency manifests
- parent-directory relationships

### Population Mode 2: Simulated Traversal From Explicit Request Files

When `configuration.canAccessFileSystem === false` and explicit `inputFiles` are present, `initFileStores()` calls `simulateFromInputFiles()`.

That simulated traversal:

- derives all parent directories of the request files up to `baseDir`
- feeds those directories to any store that implements `processDirectory()`
- then feeds the files themselves to `processFile()`

This does not discover helper files that were never provided to the request. What it does provide is a coherent virtual traversal over the explicit request files and their parent directories, so stores that depend on directory callbacks can still keep consistent state in request-only mode.

## Request Files Are Authoritative

The analyzer consistently prefers explicit request files over older cached filesystem content.

That precedence appears in several places:

1. Input sanitization:
   `sanitizeInputFiles()` uses request-provided `fileContent` when available, and only reads disk when the caller omitted content.
2. `sourceFileStore`:
   when `inputFiles` are present, the store is directly reseeded from those files instead of reusing the previous analyzable set.
3. Compiler host file reads:
   `IncrementalCompilerHost.readFile()` checks the current request context first, then the shared source-file content cache, then disk.
4. Parsed AST reuse:
   `IncrementalCompilerHost.getSourceFile()` first applies request content through `updateFile()` and only then checks the parsed `SourceFile` cache.
5. Tsconfig parsing without filesystem access:
   `createProgramOptions()` uses a `ParseConfigHost` that reads from `sourceFileStore` instead of `ts.sys` when `canAccessFileSystem === false`.

The practical consequence is simple: if a file is in the current request, its in-memory version wins over whatever was discovered earlier on disk.

## TypeScript Program And Compiler Caches

The file stores are only the first layer. Once the analyzer starts building TypeScript programs, several downstream caches are involved.

### `tsconfigContentCache`

`jsts/program/cache/tsconfigCache.ts` caches raw tsconfig contents by path.

It stores:

- actual tsconfig file contents
- synthetic empty configs used when the last extended tsconfig is missing
- a `missing` bit so later code can report incomplete configuration

This avoids re-reading the same tsconfig graph from disk or from the virtual request filesystem.

### `programOptionsCache`

`jsts/program/cache/programOptionsCache.ts` caches the output of `createProgramOptions()`.

Its cache key is:

- tsconfig path
- optional explicit tsconfig contents provided by the caller

This avoids repeated `ts.readConfigFile()` plus `ts.parseJsonConfigFileContent()` work for the same tsconfig state.

### `ProgramCacheManager`

`jsts/program/cache/programCache.ts` caches `SemanticDiagnosticsBuilderProgram` instances for the incremental path.

Important details:

- it uses a small LRU map for metadata
- the program and compiler host are stored in a `WeakMap`
- lookup is by file membership, not by tsconfig path alone
- cached programs can be incrementally rebuilt when one request file changes

This cache is mainly valuable for SonarLint / IDE usage, where multiple requests hit the same long-lived Node process.

### `sourceFileCache`

`jsts/program/cache/sourceFileCache.ts` actually owns three related pieces of state:

- a shared file-content cache used by the compiler host
- a shared parsed `ts.SourceFile` cache
- `currentFilesContext`, which is the per-request overlay of authoritative request files

The parsed AST cache is keyed by:

- normalized file path
- script target
- `jsx`
- `importHelpers`
- content version

That is why the same source file may exist in the cache more than once under different compiler options.

## Dependency-Helper Caches

The dependency-helper layer builds on top of `dependencyManifestStore`.

The main caches are:

- nearest-manifest caches in `find-up/closest.ts`
- "all manifests in parent dirs" caches in `find-up/all-in-parent-dirs.ts`
- parsed manifest caches in `parsed-dependency-files.ts`
- derived dependency and module-type caches in `dependencies.ts`

The important separation is:

- `dependencyManifestStore` owns raw manifest contents and directory ancestry
- helper caches own parsed and derived views of that data

`dependencyManifestStore.postProcess()` warms the nearest-manifest and parent-manifest caches so later rule helpers do not need to keep walking the directory tree.

## Cache Invalidation

Each layer is cleared for different reasons.

### `sourceFileStore`

`SourceFileStore` is cleared when:

- `baseDir` changes

It is also directly reseeded when explicit `inputFiles` are provided. That reseeding is effectively a per-request refresh even though it does not go through `clearCache()`.

### `tsConfigStore`

`TsConfigStore` is cleared when:

- `baseDir` changes
- `sonar.typescript.tsconfigPaths` changes
- `clearTsConfigCache` is set
- an `fsEvent` points at:
  - an already-known tsconfig
  - a `tsconfig.json` candidate in lookup mode
  - a provided-path match in property mode

When it clears, it also clears:

- `tsconfigContentCache`
- `programOptionsCache`
- `ProgramCacheManager`

This is why tsconfig invalidation is also the main invalidation path for cached TypeScript programs.

### `dependencyManifestStore`

`DependencyManifestStore` is cleared when:

- `baseDir` changes
- an `fsEvent` points at a preloadable dependency manifest

When it clears, it also calls `clearDependenciesCache()`, which resets:

- nearest-manifest caches
- parent-manifest caches
- parsed manifest caches
- derived dependency caches
- module-type caches
- minimatch helpers used by manifest resolution

There is also a narrower per-analysis switch in `analyzer.ts`: `clearDependenciesCache` can force the helper caches to be cleared before linting a file.

### `sourceFileCache`

The compiler-side source-file content cache and parsed AST cache are cleared when:

- `analyzeWithProgram()` finishes a SonarQube-style batch analysis
- the standalone gRPC service resets all shared caches before a request

They are intentionally kept warm across `analyzeWithIncrementalProgram()` calls.

## SonarQube, SonarLint, And Standalone gRPC

The same codebase serves different lifecycles.

### SonarQube Full-Project Analysis

The SonarQube path usually behaves closer to a per-analysis cache model:

- `analyzeProject()` chooses `analyzeWithProgram()`
- `analyzeWithProgram()` clears the program cache and the source-file content / AST cache at the end
- file stores and tsconfig / manifest caches are still useful during the analysis itself, but the long-lived reuse story is limited

### SonarLint / SonarQube For IDE

The IDE path is the main target for warm caches:

- `analyzeProject()` chooses `analyzeWithIncrementalProgram()`
- builder programs stay in `ProgramCacheManager`
- source-file contents and parsed ASTs stay in `sourceFileCache`
- `fsEvents`, `clearTsConfigCache`, and manifest invalidation are what keep the warm state correct

This is the path where the cache architecture matters most for latency.

### Standalone gRPC Service

`packages/grpc/src/service.ts` intentionally does not share state between requests:

- it resets all three file stores
- it clears the compiler-side source-file cache
- it analyzes an inline request-only virtual project

That path is intentionally conservative because requests are independent and may reuse overlapping synthetic paths.

## Practical Rules

If you add new analyzer logic, the safest mental model is:

- If the logic needs project-wide helper discovery, integrate it with a file store or an existing helper cache instead of doing its own ad hoc filesystem walk.
- If the logic depends on tsconfig discovery, its invalidation probably belongs with `tsConfigStore`.
- If the logic depends on dependency manifests, its invalidation probably belongs with `dependencyManifestStore` and the dependency-helper layer.
- If request files can override disk, prefer `sourceFileStore` or `currentFilesContext` over direct disk reads.
- If you add a new cache, document who owns it, what its cache key is, and which event clears it.

The architecture is maintainable only as long as every cache has a single obvious owner and a clear invalidation story.
