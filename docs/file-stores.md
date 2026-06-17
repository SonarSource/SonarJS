# File Stores

The file stores are long-lived analyzer caches that separate source-file selection from project-helper discovery.

They live in `packages/analysis/src/file-stores/` and are initialized together by `initFileStores()`. Each store owns one kind of derived project state and decides independently when that state must be recomputed.

## Why They Exist

The analyzer needs more than the current source file contents:

- it needs the set of analyzable source files
- it needs project helper files such as `tsconfig.json` and `package.json`
- it needs metadata derived from those helper files

Those concerns change for different reasons, so they are cached separately instead of being recomputed as one large blob.

## Scope Boundary

This document is only about the file stores under `packages/analysis/src/file-stores/`.

It does **not** describe:

- the TypeScript program caches under `packages/analysis/src/jsts/program/cache/`
- the higher-level dependency-helper caches under `packages/analysis/src/jsts/rules/helpers/dependency-manifests/`

Those layers are downstream consumers of the file stores, not file stores themselves.

## Two Execution Models

The analyzer has two execution models:

- **SonarQube** uses full-project analysis. In `analyzeProject.ts`, this goes through `analyzeWithProgram()` and falls back to `analyzeWithoutProgram()` for orphan files.
- **SonarQube for IDE / SonarLint** uses request-driven analysis. In `analyzeProject.ts`, this goes through `analyzeWithIncrementalProgram()`, with `analyzeWithoutProgram()` as the fallback for orphan files.

This matters for file stores because the IDE flow usually analyzes an explicit set of changed files, while the SonarQube flow typically scans the whole project.

## Store Orchestration

`initFileStores()` is the entrypoint for store refresh.

Its job is:

1. Ask each store whether its current state is still valid for the new `Configuration`.
2. Re-initialize only the stores that report themselves stale.
3. Populate those stores either by walking the filesystem or by simulating a walk from explicit request files.
4. Run each refreshed store's `postProcess()` step once source files are known.

This means a store is only recomputed when its own invalidation rules say it must be.

The main entrypoints that do this are:

- `sanitizeProjectAnalysisInput()` in `packages/analysis/src/common/input-sanitize.ts`
- `normalizeAnalyzeProjectRequest()` in `packages/grpc/src/analyze-project-normalize.ts`

Both normalize `Configuration`, optionally sanitize explicit request files, and then call `initFileStores()`.

## Population Modes

`initFileStores()` can populate stores in two different ways.

### Real Filesystem Traversal

When `configuration.canAccessFileSystem === true`, `initFileStores()` walks the tree with `findFiles()`.

That traversal:

- starts from `baseDir`
- skips paths matching `jsTsExclusions`
- calls `processDirectory()` for directories
- calls `processFile()` for files

That walk is intentionally broader than the current analyzable source-file set.

Its job is not only to find source files. It also needs to discover helper files such as `tsconfig.json` and dependency manifests. The `source-files` store applies source/test scope filtering itself during processing.

In some direct filesystem-discovery request flows, callers clear the stores before calling `initFileStores()` so a same-`baseDir` rediscovery starts from empty state.

### Simulated Traversal From Explicit Request Files

When `configuration.canAccessFileSystem === false` and explicit `inputFiles` are present, `initFileStores()` calls `simulateFromInputFiles()`.

That simulated walk:

- synthesizes all parent directories from each request file up to `baseDir`
- calls `processDirectory()` on those synthetic directories first
- then calls `processFile()` on the explicit files

This preserves parent-directory lookup semantics such as "closest manifest" and "closest tsconfig" lookups without inventing files that the request did not provide.

## Refresh Inputs

The current implementation uses two main cache domains:

- **Analyzable-file selection**: configuration that decides which source files are kept for analysis.
- **Project-file discovery**: configuration that decides which helper files can be discovered during the project walk.

The analyzer models those domains explicitly because different stores depend on different inputs.

## `source-files`

`source-files.ts` owns the analyzable source-file set.

It stores:

- the normalized `AnalyzableFiles` map
- ignored directories
- a directory index used by TypeScript config resolution when filesystem access is unavailable

It depends on:

- the current analyzed file set when `inputFiles` are provided
- source-file filtering configuration such as suffixes, inclusions, exclusions, tests, bundle detection, and JS/TS exclusions

### Refresh Model

When `inputFiles` are present, `sourceFileStore.isInitialized()` always rebuilds itself from that explicit file list.

That is the main product behavior in SonarQube and SonarLint:

- the store does **not** try to reuse the previous analyzed source-file set across analyses
- the explicit request files are authoritative
- the directory index is rebuilt from the new request files

When `inputFiles` are not present, the store behaves like a real discovery cache and can be reused until the analyzable-file-selection configuration changes or a caller explicitly clears it before rediscovery.

## `tsconfigs`

`tsconfigs.ts` owns discovered TypeScript configuration files.

It stores:

- `tsconfig.json` files found by project lookup
- explicit `sonar.typescript.tsconfigPaths` matches
- referenced tsconfigs discovered while resolving project references

It depends on:

- project helper-file discovery, not on the current analyzed source-file set
- `tsConfigPaths`
- filesystem events that mention tsconfig files
- whether filesystem access is available

### Refresh Model

`tsConfigStore` is refreshed when:

- the base directory changes
- filesystem access mode changes
- the explicit `tsConfigPaths` setting changes
- the project-file-discovery configuration changes
- `fsEvents` mention an existing or potentially relevant tsconfig
- `clearTsConfigCache` is requested

The important point is that `tsconfigs` does **not** refresh just because a different subset of source files is being analyzed. It refreshes when tsconfig discovery itself may have changed.

## `dependency-manifests`

`dependency-manifests.ts` owns discovered dependency helper files such as:

- `package.json`
- supported Deno manifest files
- supported workspace-level dependency manifests

It also warms the dependency-resolution caches used later by:

- dependency-sensitive rule activation
- module-type detection
- TypeScript and runtime signal extraction

It depends on:

- project helper-file discovery, not on the current analyzed source-file set
- filesystem events that mention supported manifest files
- whether filesystem access is available

### Refresh Model

`dependencyManifestStore` is refreshed when:

- the base directory changes
- filesystem access mode changes
- the project-file-discovery configuration changes
- `fsEvents` mention a supported dependency manifest

Like `tsconfigs`, this store is intentionally independent from the current set of analyzed source files.

## `generated-sources`

`generated-sources/store.ts` owns metadata about generated source files.

See [Generated Source Detection](./generated-sources.md) for the detector pipeline, linter integration, and cache behavior behind this store.

It maintains one project-derived detector cache:

- generated-file to family mappings
- config paths used by generated-source detectors
- watched output paths

During traversal it also collects the temporary inputs needed for derivation:

- walked directories
- walked JS/TS file paths that match the current suffix set
- preloaded detector-specific files needed by detectors

`postProcess()` then merges raw `package.json` contents from `dependencyManifestStore` into that
snapshot and turns the combined view into the project-derived cache above.

The tagged subset is not cached inside the store. `analyzeProject()` computes it later from the
current analyzable files via `generatedSourceStore.observeGeneratedSources(...)`.

The most useful way to reason about this store is by the corresponding Sonar property families.

- **Source-scope properties**: `sonar.sources`, `sonar.tests`, `sonar.inclusions`, `sonar.exclusions`, `sonar.test.inclusions`, and `sonar.test.exclusions`
- **Filesystem-walk exclusions**: `sonar.javascript.exclusions` and `sonar.typescript.exclusions`

Internally, the source-scope properties map to `sources`, `tests`, `inclusions`, `exclusions`, `testInclusions`, and `testExclusions`.
They decide which discovered source files remain visible to analysis, so they affect only the
analysis-time tagged subset and telemetry.

Internally, `sonar.javascript.exclusions` and `sonar.typescript.exclusions` are merged into `jsTsExclusions`.
They are different from `sonar.exclusions`: they are applied during `findFiles()`, before helper files such as `package.json` are discovered.
Because the detector cache derives metadata from those helper files, the current implementation conservatively invalidates the **detector cache** whenever `jsTsExclusions` changes.

For example:

- changing `sonar.exclusions` to ignore `src/generated/**` only changes the tagged generated-file subset
- changing `sonar.javascript.exclusions` or `sonar.typescript.exclusions` to ignore `**/package.json` changes detector inputs and invalidates the detector cache

The store also depends on:

- **project helper files** because the detector cache derives metadata from files such as `package.json`
- **JS/TS suffix settings** because detector output matching depends on the supported source extensions

There is one additional implementation detail worth keeping explicit: store order matters.
`generatedSourceStore` intentionally runs after `sourceFileStore` and `dependencyManifestStore`
so it can reuse their cached file contents instead of rereading the same detector inputs itself.

### Refresh Model

`generatedSourceStore` recomputes the detector cache when:

- the base directory changes
- filesystem access mode changes
- JS/TS suffix settings change
- `sonar.javascript.exclusions` or `sonar.typescript.exclusions` changes
- `fsEvents` mention a relevant helper file, generated-source config file, or watched output path

`generatedSourceStore` does **not** refresh just because the current analyzable source-file set
changes. Source-scope properties and explicit request files refresh `sourceFileStore`; the tagged
generated-file subset is then recomputed at analysis time from `sourceFileStore.getFiles()`.

When filesystem access is unavailable, the store is skipped entirely. The request-only simulated walk still exists for the other stores, but generated-source metadata is not derived in that mode.

## `fsEvents`

`fsEvents` is part of `Configuration` and is filled by the Java-side file watcher.

The analyzer uses it as an invalidation signal for helper-file caches:

- `tsconfigs` watches tsconfig-related file names and paths
- `dependency-manifests` watches supported manifest file names and paths
- `generated-sources` watches both helper files and detector-specific generated-source inputs and outputs

This allows long-lived analyzer processes to keep caches warm while still clearing them as soon as relevant project files change.

## Summary Table

| Store                  | Primary responsibility                                       | Depends on analyzed source files | Depends on helper-file discovery         |
| ---------------------- | ------------------------------------------------------------ | -------------------------------- | ---------------------------------------- |
| `source-files`         | Current analyzable source-file set                           | Yes                              | Indirectly, through walk exclusions only |
| `tsconfigs`            | Discovered tsconfig files                                    | No                               | Yes                                      |
| `dependency-manifests` | Discovered dependency manifests and warmed dependency caches | No                               | Yes                                      |
| `generated-sources`    | Project-derived generated-source metadata                    | Only for analysis-time tagging   | Yes                                      |

## Practical Rule

If a change affects:

- **which source files are analyzed**, refresh `source-files`
- **which helper files can be discovered**, refresh `tsconfigs` and `dependency-manifests`
- **generator discovery inputs** such as dependency manifests, generated-source config files, watched outputs, or JS/TS suffix settings, refresh `generated-sources` too

That split is the reason the file stores stay understandable even though they are all initialized from the same entrypoint.
