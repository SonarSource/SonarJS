# Generated Source Detection

The generated-source detection subsystem identifies analyzable JS/TS files that were produced by project-local generators and exposes that information to the linter.

This document explains the mechanism from first principles. It is meant for readers who do not already know the file-store architecture or the generated-source helpers.

## Why This Exists

Some rules are less useful on generated code than on hand-written code.

The analyzer therefore needs a way to answer a narrow question for each file:

- is this file a generated source file?

The new subsystem does **not** decide on its own which issues to suppress. It only produces metadata. The linter then uses that metadata when a rule explicitly declares that it should be skipped on generated sources.

## What The Subsystem Contains

The subsystem contains:

- a new `generatedSourceStore` file store
- a detector contract for tool-specific generated-source detectors
- helper functions for detector implementations
- integration with `analyzeProject()` and the JS/TS linter
- cache invalidation rules so long-lived analyzer processes can refresh when relevant project files change
- observability and telemetry for derived and visible generated-source metadata

Concrete support for specific generators is provided by detectors registered in `GENERATED_SOURCE_DETECTORS`.

## Core Terms

- **Generated source file**: an analyzable JavaScript or TypeScript file that a detector decided was produced by a generator.
- **Family**: the detector-owned label attached to a generated file, such as a future tool family like `graphql-codegen`.
- **Detector**: a plugin-like object that knows how to recognize one generator family.
- **Task invocation**: a normalized command extracted from project metadata, currently from `package.json` scripts.
- **Config path**: a generator configuration file path that should invalidate the cache if it changes.
- **Watched output path**: an output file or directory that should invalidate the cache if it changes.

## End-to-End Flow

### 1. File stores are initialized before analysis

`initFileStores()` initializes `source-files`, `dependency-manifests`, `generated-sources`, and `tsconfigs`.

The new store is intentionally different from the others:

- `generatedSourceStore.processFile()` does nothing during the file walk
- the real work happens later in `postProcess()`

That split exists because generated-source detection needs metadata from other stores before it can derive anything useful.

### 2. Other stores prepare the inputs it depends on

Before `generatedSourceStore.postProcess()` runs:

- `sourceFileStore` has already computed the analyzable source-file set
- `dependencyManifestStore` has already collected `package.json` files and warmed dependency caches

This is why generated-source detection lives as its own store instead of being folded into file discovery.

### 3. The store derives project-wide generated-source metadata

When filesystem access is available, `generatedSourceStore.postProcess()` calls:

```ts
deriveGeneratedSources(baseDir, dependencyManifestStore.getPackageJsons(), {
  sourceFileMatcher,
});
```

`deriveGeneratedSources()` then:

1. iterates over discovered `package.json` files
2. parses each manifest
3. collects task invocations from supported providers
4. lazily resolves project dependencies for that package
5. runs every registered detector
6. merges the detector outputs into one project-level result

If no detector is registered, the function returns immediately with empty metadata and does not even traverse package metadata.

### 4. The store keeps both full and request-filtered views

The store keeps two related maps:

- `derivedFamilyByFile`: every generated file derived for the project
- `familyByFile`: only the generated files that are visible for the current analysis request

That filtered view matters because the analyzer has two execution styles:

- full-project analysis, where all analyzable files are visible
- request-driven analysis, where only an explicit file subset may be visible

The store therefore never exposes generated files that are not part of the current analyzable file set.

### 5. The linter consumes the metadata

`analyzeProject()` passes this predicate into `Linter.initialize()`:

```ts
filePath => generatedSourceStore.getFamily(filePath) !== undefined;
```

During rule selection, the linter computes `isGeneratedSource` for the current file.

That value is used by `filterGeneratedSource`, which disables only rules whose metadata sets:

```ts
skipOnGeneratedSource: true;
```

So the generated-source subsystem is a metadata source for rule filtering. It is not a blanket “ignore generated files” switch.

### 6. The store computes observability for the current snapshot

After rebuilding the request-filtered `familyByFile` view, the store computes an observability snapshot for the current state.

That snapshot serves two purposes:

- expose structured telemetry for the current generated-source state
- emit logs for the currently tagged generated files and for declaration-only families that are intentionally omitted from observability totals

The snapshot is built from:

- `resolvedFamilyByFile`: every generated file derived for the project
- `taggedFamilyByFile`: the subset currently visible to the analysis request
- the current analysis configuration

For each detector family, observability keeps only two counters:

- `resolvedFileCount`: files derived for that family before request filtering
- `taggedFileCount`: derived files currently visible to the analysis request

The difference between those counters covers every resolved generated file that is not currently tagged. That includes files omitted by `request.files`, files outside the current source/test scope, files filtered by exclusions, and files later rejected by source-file acceptance checks such as size, bundle, or minification filters.

The current implementation does not publish separate `excluded`, `out-of-scope`, or `resolved only` buckets, and it does not emit DEBUG samples for those cases.

Families whose resolved outputs are all `.d.ts` files excluded by the default `**/*.d.ts` JS/TS exclusion remain a special case: they are omitted from telemetry totals and logged separately at DEBUG level so the omission is explicit.

### 7. Logs are deduplicated across refreshes

The store logs observability only when the content changes.

The deduplication fingerprint includes:

- aggregate telemetry totals
- per-family tagged samples
- ignored declaration-only family samples

This means repeated refreshes do not re-emit identical INFO and DEBUG lines, but a request refresh that changes the tagged sample does produce a new observability log entry.

The fingerprint is intentionally preserved across cache invalidations, so rebuilding identical generated-source state does not log the same observability snapshot again.

## Detector Model

Each detector implements the `GeneratedSourceDetector` contract and owns one family.

The detector receives:

- `baseDir`: the analysis root
- `packageDir`: the directory that owns the current `package.json`
- `getDependencies()`: a lazy dependency lookup for that package
- `taskInvocations`: normalized command invocations derived from project metadata
- `sourceFileMatcher`: the current analysis-time definition of “analyzable source file”

The detector returns:

- `familyByFile`: generated-file to family mappings
- `configPaths`: config files that should invalidate the cache on change
- `watchedOutputPaths`: output files or directories that should invalidate the cache on change

### Important detector rule

Detectors are expected to report only project-local paths under `baseDir`.

The shared helpers enforce that boundary so one project cannot accidentally claim generated files outside the analysis root.

## Shared Helper Responsibilities

The helpers under `packages/analysis/src/jsts/rules/helpers/generated-sources/` exist so detectors can stay small and declarative.

### Evidence helpers

`hasToolEvidence()` answers “is this generator probably in use here?” by combining:

- dependency evidence
- task-invocation evidence

This lets a detector avoid expensive work when the project shows no sign of using its tool.

### Config-path resolution

`resolveConfigPaths()` looks for generator config files in two ways:

- explicit flag values in matching task invocations
- fallback sibling basenames such as a default config filename

If explicit config flags are present, they win over fallback basenames.

### Output resolution

`resolveGeneratedOutputsFromLiteralPaths()` resolves declared output paths and returns three things:

- source files that currently exist
- output directories that currently exist
- watched output paths, even if the target does not exist yet

That last point is intentional. A missing output today may be created tomorrow, and the cache still needs to invalidate when that happens.

### Deterministic merging

`mergeDerivedGeneratedSources()` sorts paths before insertion and keeps the first family that claimed a file.

That gives two useful guarantees:

- generated-source metadata is deterministic across runs and platforms
- detector order in `GENERATED_SOURCE_DETECTORS` defines conflict resolution when two detectors claim the same file

## Task Invocation Parsing

Generated-source detectors need a small amount of project-task awareness, but not a full shell parser.

The current implementation intentionally recognizes only simple, defensible cases:

- direct commands in `package.json` scripts
- command chains separated by `&&`
- quoted arguments
- `npx <tool> ...`
- `npx -- <tool> ...`
- `pnpm exec <tool> ...`

It intentionally does **not** try to interpret broader shell behavior such as:

- environment-assignment preambles like `NODE_ENV=production tool ...`
- separators other than `&&`
- runner options such as `npx --yes ...`
- package-manager script indirection such as `yarn <script>` or `npm run <script>`
- shell-generated or concatenated path expressions

That restriction is deliberate. The goal is predictable detector behavior, not best-effort shell emulation.

## Path and Filesystem Safety Rules

The helper layer is conservative about which paths it trusts.

### Literal paths only

Only literal path tokens are resolved.

Tokens containing shell interpolation or string construction are ignored, for example values containing:

- `$`
- backticks
- `+`

### `baseDir` boundary

Resolved paths must stay under the current analysis `baseDir`.

This prevents detectors from producing metadata for files outside the analyzed project.

### Source-file filtering

Generated outputs are filtered through the configured JS/TS suffix set used by the analysis.

In practice, this means the generated-source subsystem only surfaces files that the current analysis would consider analyzable source files anyway.

### Recursive directory pruning

When a detector declares an output directory and asks for recursive scanning, the helper skips obvious nested build or cache directories such as:

- `node_modules`
- `dist`
- `build`
- `.cache`
- `coverage`
- `.next`

This keeps a declared output directory from recursively pulling in unrelated nested artifacts.

## Cache and Invalidation Model

The generated-source store is the hybrid file store described in `file-stores.md`.

It depends on three kinds of state at once:

- project helper-file discovery
- analyzable source-file selection
- the current explicit request file set, when analysis is request-driven

### Full recomputation happens when:

- `baseDir` changes
- filesystem access mode changes
- analyzable-file-selection configuration changes
- project-file-discovery configuration changes
- `fsEvents` mention a relevant manifest, config file, generated file, or watched output path

`fsEvents` can also invalidate the store through detector-declared watched basenames, even when the detector had not yet resolved a full config path.

### Request-only refresh happens when:

- the explicit set of request files changes
- the derived metadata itself is still valid

In that case the store does not recompute detector output. It only rebuilds the filtered `familyByFile` view for the new request.

### No-filesystem mode

Actual derivation currently requires filesystem access.

If `canAccessFileSystem` is `false`, `postProcess()` keeps the store empty. The store still tracks its configuration state, but it does not attempt to derive generated-source metadata from partial request payloads alone.

That is an important current limitation.

## Telemetry And Logging

The subsystem exposes two observability outputs:

- structured telemetry via `generatedSourceStore.getObservabilityTelemetry()`
- log lines emitted during refresh through `logGeneratedSourceObservability()`

### Structured telemetry

The top-level telemetry shape is:

```ts
type GeneratedSourcesTelemetry = {
  familyCount: number;
  resolvedFileCount: number;
  taggedFileCount: number;
  families: GeneratedSourceFamilyTelemetry[];
};
```

Each family entry carries the same counters for one detector family.

The counters mean:

- `resolvedFileCount`: files derived for that family before request filtering
- `taggedFileCount`: derived files currently visible to the analysis request

### Log output

When telemetry is non-empty, the store logs:

- one INFO summary line for the current snapshot
- one INFO line per family
- DEBUG sample lines for tagged files when a family has tagged outputs
- DEBUG lines for declaration-only families that are intentionally ignored from observability totals

The sampled file paths are relative to `baseDir` and capped to a small fixed sample size.

### Declaration-only default exclusions

Families whose resolved outputs are all `.d.ts` files excluded by the default `**/*.d.ts` JS/TS exclusion are omitted from telemetry totals.

That rule remains true even when those same `.d.ts` files also match `sonar.exclusions` or `sonar.test.exclusions`. The special case is about declaration-only default JS/TS exclusions, not about whether another analysis-scope exclusion also applies.

They are still reported through DEBUG logging so the omission is explicit rather than silent.

## Operational Notes

- The mechanism is metadata-driven. It does not inspect source-file contents to guess whether a file is generated.
- The store derives its data in `postProcess()` because it depends on outputs from other stores.
- The store exposes only analyzable files for the current request, even if more generated files were derived for the project.
- Request-driven analyses can change tagged samples without changing project-wide derived metadata.
- JS/TS exclusions and source/test scope exclusions are different concepts and affect observability in different ways.
- The detector foundation is intentionally conservative about shell parsing and path resolution.

## Related Documentation

- [File Stores](./file-stores.md)
