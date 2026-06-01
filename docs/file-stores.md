# File Stores

The file stores are long-lived analyzer caches that separate source-file selection from project-helper discovery.

They live in `packages/analysis/src/file-stores/` and are initialized together by `initFileStores()`. Each store owns one kind of derived project state and decides independently when that state must be recomputed.

## Why They Exist

The analyzer needs more than the current source file contents:

- it needs the set of analyzable source files
- it needs project helper files such as `tsconfig.json` and `package.json`
- it needs metadata derived from those helper files

Those concerns change for different reasons, so they are cached separately instead of being recomputed as one large blob.

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

That is the IDE-style behavior:

- the store does **not** try to reuse the previous analyzed source-file set across analyses
- the directory index is rebuilt from the new request files

When `inputFiles` are not present, the store can be reused until the analyzable-file-selection configuration changes.

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

`generated-sources.ts` owns metadata about generated source files.

It stores:

- generated-file to family mappings
- config paths used by generated-source detectors
- watched output paths
- a filtered view of those matches for the current request

It depends on a mix of the other stores:

- **project helper files** because detectors derive metadata from files such as `package.json`
- **source-file selection** because only analyzable source files should be surfaced to the linter
- **explicit request files** in request-driven analysis, where the visible generated-file subset may change from one request to the next

### Refresh Model

`generatedSourceStore` is refreshed when:

- the base directory changes
- filesystem access mode changes
- analyzable-file-selection configuration changes
- project-file-discovery configuration changes
- `fsEvents` mention a relevant helper file, generated-source config file, or watched output path

It also has a lighter-weight request refresh:

- when the explicit request file set changes but the derived metadata is still valid, the store can refresh its filtered view without recomputing everything

This is why `generated-sources` is the hybrid store: it depends on both helper-file discovery and the currently visible source-file set.

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
| `generated-sources`    | Generated-source metadata visible to the linter              | Yes                              | Yes                                      |

## Practical Rule

If a change affects:

- **which source files are analyzed**, refresh `source-files`
- **which helper files can be discovered**, refresh `tsconfigs` and `dependency-manifests`
- **both**, refresh `generated-sources` too

That split is the reason the file stores stay understandable even though they are all initialized from the same entrypoint.
