# Node `analyze-project` vs `jsts-go` Equivalence Assessment

Date: 2026-05-06
Branch: `feat/tsgolint-grpc-poc`

## Scope

This document compares:

1. The current Node.js `AnalyzeProject` runtime and JS/TS analysis pipeline.
2. The current Java wrapper around `jsts-go` plus the Go `sonar-server` internals.

The comparison starts at the internal `AnalyzeProject` gRPC request and follows the flow until Node reaches ESLint rule execution, then contrasts that with the current Go + `jsts-go` path.

The goal is to identify:

- what is already equivalent enough for the currently offloaded JS/TS issue subset
- what still differs from Node today
- what would still be required if the Go path were expected to match Node more closely

## Jira Alignment

`JS-1140` is now split. This assessment is the current branch-level reference for:

- `JS-1739` - implement `analyze-project` core semantics in Go
- `JS-1745` - close remaining `analyze-project` and runtime parity gaps for migrated rules
- `JS-1743` - add a Node-vs-Go parity corpus and differential test harness for shared JS/TS rules
- `JS-1744` - benchmark Node-vs-Go performance on shared JS/TS workloads

## High-Level Conclusion

The assessment from before the rebase was stale. The current Go path is no longer just a thin fixed-rule pass. It now mirrors several important parts of the Node pipeline for the migrated JS/TS issue subset:

- request normalization for config, files, rules, `pathMap`, `bundles`, and `rulesWorkdir`
- inline `fileContent` support through `VirtualFiles` plus an overlay VFS
- `canAccessFileSystem=false` through a deny-all base FS plus overlay VFS
- project-tree discovery when `req.files` is omitted
- JS/TS source/test/inclusion/exclusion filtering and suffix handling
- discovery of `tsconfig.json`, `package.json`, `deno.json`, and `deno.jsonc`
- SonarQube batch and SonarLint incremental TS-go program paths
- configurable orphan typed-program creation
- AST-only fallback for files that are left without a TS program
- explicit `disableTypeChecking` routing through the AST-only lane
- per-file rule filtering for file type, analysis mode, language, blacklisted extensions, required dependency, required module type, and required ECMAScript version
- Go rule metadata and default options generated from Node rule metadata

It is still not a full Node `analyze-project` equivalent. The main remaining gaps are:

- lease parity is still only partial: the Go service now enforces a single lease and shuts down on lease loss, but it still does not mirror Node's startup lease-acquisition timeout semantics
- several config inputs are parsed but still unused
- no Go equivalent yet for Node `customForConfiguration` option transforms when a migrated rule still preserves an upstream/runtime option-shape mismatch
- outputs are still issue-only; Node still owns parse/runtime errors, AST, metrics, highlights, symbols, CPD, telemetry, and quick fixes

## Evidence Base

Main code paths checked for this update:

- Node runtime:
  - `packages/grpc/src/analyze-project-server.ts`
  - `packages/grpc/src/analyze-project-server-lifecycle.ts`
- Node analysis:
  - `packages/analysis/src/analyzeProject.ts`
  - `packages/analysis/src/analyzeWithProgram.ts`
  - `packages/analysis/src/analyzeWithIncrementalProgram.ts`
  - `packages/analysis/src/analyzeWithoutProgram.ts`
  - `packages/analysis/src/file-stores/index.ts`
  - `packages/analysis/src/common/input-sanitize.ts`
  - `packages/analysis/src/jsts/linter/linter.ts`
  - `packages/analysis/src/jsts/linter/filters/*`
  - `packages/analysis/src/jsts/rules/helpers/configs.ts`
- Java bridge:
  - `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/AnalyzeProjectMessages.java`
  - `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/grpc/AnalyzerGrpcServerImpl.java`
  - `sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/JsTsChecks.java`
- Go wrapper / server:
  - `server-go/sonar-server/normalize.go`
  - `server-go/sonar-server/filesystem.go`
  - `server-go/sonar-server/file_stores.go`
  - `server-go/sonar-server/path_patterns.go`
  - `server-go/sonar-server/dependency_signals.go`
  - `server-go/sonar-server/service.go`
  - `server-go/sonar-server/service_lifecycle.go`
  - `server-go/sonar-server/service_test.go`
  - `server-go/sonar-server/requested_rules.go`
  - `server-go/sonar-server/dependency_signals.go`
  - `tools/generate-go-rule-metadata.ts`

## Matrix Legend

- `Status`: how close the current Go path is to Node for that area.
- `Equivalent enough`: close enough for the current secondary JS/TS issue-engine scope.
- `Partial`: the main behavior exists, but important Node semantics are still missing.
- `Gap`: Node behavior is still missing.
- `Out of scope`: only needed if Go is expected to replace more than the current typed-rule sidecar scope.

## Comparison Matrix

| Category         | Area                                                                                | Node today                                                                                                                                                  | Wrapper + `jsts-go` today                                                                                                                                                                                                        | Status            | Main remaining work                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Runtime          | RPC surface                                                                         | Exposes streaming `AnalyzeProject`, unary `AnalyzeProjectUnary`, `CancelAnalysis`, and `Lease`.                                                             | Exposes the same RPC names and basic request/response shapes.                                                                                                                                                                    | Equivalent enough | None at API shape level.                                                                                      |
| Runtime          | Single-flight analysis                                                              | Enforces one in-flight analysis across streaming and unary calls; overlap returns `RESOURCE_EXHAUSTED`.                                                     | The Go service now keeps a single in-flight analysis slot across streaming and unary calls and rejects overlap with `RESOURCE_EXHAUSTED`.                                                                                        | Equivalent enough | None for the current sidecar scope.                                                                           |
| Runtime          | Cancellation                                                                        | Real cancellation propagates through the runtime; public `CancelAnalysis` reports whether an active analysis was cancelled.                                 | The Go service now keeps a cancellable per-analysis context, reports `cancelled=true` only for active analyses, emits `cancelled` instead of `meta` on the stream, and still returns partial unary results after cancellation.   | Equivalent enough | Cancellation checks are still coarse-grained, matching the current Node analysis loop granularity.            |
| Runtime          | Lease and lifetime ownership                                                        | Lease acquisition is part of ownership; lease loss triggers shutdown. Startup timeout is tied to lease acquisition.                                         | The Go service now enforces a single lease and requests server shutdown on lease completion, cancellation, or error. Startup timeout is still not mirrored.                                                                      | Partial           | Port startup lease timeout semantics only if Java still relies on Node owning that behavior.                  |
| Request          | Request normalization and canonicalization                                          | Rich sanitization and validation of config, paths, files, and enums before analysis.                                                                        | Normalizes `baseDir`, config paths, files, `pathMap`, `VirtualFiles`, rules, `bundles`, and `rulesWorkdir`. Validation is still thinner than Node.                                                                               | Partial           | Add richer invalid-request checks only if Java still depends on Node's exact failure behavior.                |
| Request          | Inline `fileContent` and `pathMap`                                                  | Request-provided `fileContent` overrides disk reads and original request keys are preserved via `pathMap`.                                                  | `NormalizeProjectFiles` builds `VirtualFiles`; the overlay VFS makes request content drive discovery and program creation.                                                                                                       | Equivalent enough | None for the current scope.                                                                                   |
| Request          | `canAccessFileSystem=false`                                                         | Simulates traversal from input files and keeps analysis working without disk access.                                                                        | Uses a deny-all FS plus overlay VFS; explicit virtual files drive discovery and analysis.                                                                                                                                        | Equivalent enough | None for explicit-file flows.                                                                                 |
| Request          | Omitted `files` request field                                                       | If `files` is omitted and FS access is allowed, Node discovers analyzable files from disk.                                                                  | `walkProjectTree` now discovers project files when `req.files` is omitted.                                                                                                                                                       | Equivalent enough | None for current JS/TS discovery needs.                                                                       |
| Discovery        | JS/TS source/test/inclusion/exclusion and suffix handling                           | Classifies files using `sources`, `tests`, inclusions, exclusions, test inclusions/exclusions, and suffix settings.                                         | The Go path now mirrors those path-based JS/TS filters and uses configured JS/TS suffixes.                                                                                                                                       | Equivalent enough | None for JS/TS scope.                                                                                         |
| Discovery        | Content-based prefilters                                                            | Local discovery also applies bundle detection, minified detection, and max-file-size checks.                                                                | `DetectBundles` and `MaxFileSize` are normalized but unused; there is no equivalent content-based skip layer.                                                                                                                    | Partial           | Add content-based prefilters if migrated rules must match Node skip behavior.                                 |
| Discovery        | Manifest and tsconfig discovery                                                     | Node stores gather tsconfigs and dependency manifests; dependency helpers also understand `pnpm-workspace.yaml` and JSONC nuances.                          | The Go path discovers `tsconfig.json`, `package.json`, `deno.json`, and `deno.jsonc`, then builds dependency/module signals from them.                                                                                           | Partial           | Parse `deno.jsonc` as JSONC and add `pnpm-workspace.yaml` support if parity needs it.                         |
| Programs         | SonarQube batch typed path                                                          | Walks provided/discovered tsconfigs, analyzes typed files, then falls back to untyped analysis for leftovers.                                               | Builds typed programs from discovered/prioritized tsconfigs, optionally creates an inferred typed program for orphans, then falls back to AST-only analysis for the remaining runnable-without-program rule subset.              | Partial           | Broaden no-type coverage only if more migrated rules become runnable without the typechecker.                 |
| Programs         | SonarLint incremental typed path                                                    | Uses incremental typed analysis with cache-aware builder programs and invalidation inputs.                                                                  | There is now an incremental per-file path with a per-request program cache, plus the same AST-only fallback for files left without a program.                                                                                    | Partial           | No long-lived incremental cache semantics; `FsEvents` is parsed but unused.                                   |
| Programs         | `tsConfigPaths` and project references                                              | Provided tsconfig paths override lookup discovery when found; project references are followed.                                                              | Provided tsconfig patterns are prioritized, warnings are emitted when none match, and program creation follows project references.                                                                                               | Equivalent enough | No comparable persistent tsconfig cache/invalidation semantics.                                               |
| Programs         | Orphan files                                                                        | Can create a typed orphan program; otherwise Node warns and analyzes leftovers without type information.                                                    | `CreateTSProgramForOrphanFiles` controls inferred typed-program creation, and leftover files are now routed through AST-only analysis for rules that explicitly support running without a program.                               | Partial           | The current no-type lane only covers the runnable-without-program migrated subset.                            |
| Programs         | `disableTypeChecking`                                                               | Completely disables typed program creation and routes everything through untyped analysis.                                                                  | Now skips typed program creation entirely and routes all JS/TS files through the AST-only lane. Typed-only migrated rules stay silent, while runnable-without-program rules still execute.                                       | Partial           | Expand no-type rule coverage only if more migrated rules are meant to run without the typechecker.            |
| Programs         | Inferred-program defaults                                                           | Orphan programs merge discovered compiler options when possible, otherwise use Node defaults.                                                               | Inferred programs use TS-go defaults from `CreateInferredProjectProgram`.                                                                                                                                                        | Partial           | Align defaults only if typed behavior differences become observable.                                          |
| Parsing          | Parser selection and untyped JS execution model                                     | Chooses TS parser, Babel parser, Vue parser, module/script fallback, and can run untyped JS/TS rules without a TS program.                                  | Runs through TypeScript-go programs and `RunLinterOnFile`; there is no Babel/Vue parser-selection layer.                                                                                                                         | Out of scope      | Needed only if Go is meant to replace Node's broader parser-driven JS/TS execution model.                     |
| Rules            | Rule partitioning between engines                                                   | Node still executes non-migrated rules and all non-JS/TS paths.                                                                                             | Java partitions selected Sonar keys to `jsts-go`; other rules stay on Node.                                                                                                                                                      | Equivalent enough | None for the current split design.                                                                            |
| Rules            | Per-file rule filtering: file type, analysis mode, language, blacklisted extensions | Filters rules before ESLint runs. Changed files force `DEFAULT` behavior even when request `analysisMode` is `SKIP_UNCHANGED`.                              | Equivalent filters now exist, including Node's `fileStatus` override semantics: `SAME` keeps the requested mode, `CHANGED` and `ADDED` fall back to `DEFAULT`.                                                                   | Equivalent enough | None for the current JS/TS issue scope.                                                                       |
| Rules            | Dependency, module-type, and ECMAScript gating                                      | Filters rules using dependency manifests, module type, and effective ECMAScript year.                                                                       | Equivalent high-level gates now exist using manifest-derived signals and generated rule metadata.                                                                                                                                | Partial           | ECMAScript detection is still approximate, and manifest support is not fully equivalent.                      |
| Rules            | React-on-Vue suppression                                                            | React-specific rules are suppressed on `.vue` files.                                                                                                        | No equivalent Go-side filter exists.                                                                                                                                                                                             | Gap               | Add the same suppression if React rules keep moving to Go.                                                    |
| Rules            | Rule metadata source of truth                                                       | Runtime reads JS rule metadata and defaults directly.                                                                                                       | Go metadata and default options are generated from Node rule modules by `generate-go-rule-metadata.ts`.                                                                                                                          | Equivalent enough | Keep generator coverage aligned as more rules move.                                                           |
| Rules            | Rule option defaulting and merge behavior                                           | Merges rule defaults with user configuration before ESLint execution.                                                                                       | Generic merge logic now does the same, including current bridge mappings such as `S6544` companion activation and the `S131` non-union default override.                                                                         | Equivalent enough | None for rules that only need plain merge semantics.                                                          |
| Rules            | `customForConfiguration` transforms                                                 | Applies per-field transforms from rule metadata before the final ESLint config is built.                                                                    | Java sends raw proto `Value`s and Go merges them without the Node transform layer. This only matters for migrated rules that still reuse an upstream/runtime option shape instead of consuming Sonar's parameter shape directly. | Partial           | Port or replace `customForConfiguration` only for migrated rules that still need that compatibility layer.    |
| Request          | Parsed-but-unused Node-specific config knobs                                        | Node uses `environments`, `globals`, `allowTsParserJsFiles`, `skipNodeModuleLookupOutsideBaseDir`, `FsEvents`, cache-clearing knobs, and test-metric knobs. | These fields are normalized, but the current Go path does not use them meaningfully.                                                                                                                                             | Out of scope      | Needed only if Go starts hosting rules or outputs that depend on those Node/ESLint-specific semantics.        |
| Request          | `bundles`, `rulesWorkdir`, hook rules, and CSS rules                                | Node can load external bundles, pass `workDir`, and analyze CSS/hook rules through the main endpoint.                                                       | `bundles`, `rulesWorkdir`, and `cssRules` are normalized but unused by the Go JS/TS path.                                                                                                                                        | Out of scope      | Required only if Go expands beyond the current typed JS/TS rule offload.                                      |
| Output           | Issues                                                                              | Returns issues as part of full per-file results.                                                                                                            | Returns issues only.                                                                                                                                                                                                             | Equivalent enough | None for issue-only offload.                                                                                  |
| Output           | Parse errors and per-file runtime errors                                            | Has structured parse-error and file-level runtime-error channels.                                                                                           | Top-level failures become warnings or RPC failures; there is no structured per-file parse/runtime result channel.                                                                                                                | Gap               | Add structured non-issue result paths if Go must replace Node analysis results.                               |
| Output           | AST, metrics, highlights, symbols, CPD, `NOSONAR`                                   | Produces these artifacts and Java imports them.                                                                                                             | No equivalent outputs exist.                                                                                                                                                                                                     | Gap               | Required only if Go becomes primary for JS/TS endpoint results.                                               |
| Output           | Quick fixes, telemetry, and richer meta                                             | Node can emit quick fixes and telemetry in addition to warnings.                                                                                            | Go meta currently carries warnings only.                                                                                                                                                                                         | Partial           | Add telemetry and quick-fix conversion if continuity is needed.                                               |
| Java integration | Cache and dedupe integration                                                        | Main Node results participate in cache/AST/CPD handling and external issue dedupe.                                                                          | `jsts-go` issues are imported directly and do not participate in equivalent artifact pipelines.                                                                                                                                  | Out of scope      | Needed only if Go takes over more than issue reporting.                                                       |
| Java integration | Sidecar failure window                                                              | Node is the primary executor, so there is no cross-engine handoff window.                                                                                   | The sidecar is best effort, but if rules are removed from Node because `jsts-go` looked healthy and the sidecar then dies, that run can lose those issues.                                                                       | Partial           | Add retry/fallback partitioning if those rules become important enough that best-effort loss is unacceptable. |

## Most Important Remaining Deltas

If the target is "make the current `jsts-go` sidecar match Node more closely for migrated JS/TS rules", the next items with the highest practical value are:

1. For future migrated configurable rules that still preserve an upstream/runtime option-shape mismatch, port or replace Node `customForConfiguration` transforms.
2. Decide which currently parsed-but-unused config inputs matter for migrated rules:
   - `environments`
   - `globals`
   - `FsEvents`
   - `allowTsParserJsFiles`
   - `skipNodeModuleLookupOutsideBaseDir`
3. Add React-on-Vue suppression if React-specific rules keep moving to Go.
4. If Go is ever expected to become more than a secondary issue engine, close the remaining structural gaps:
   - startup lease timeout semantics
   - parse/runtime error channels
   - telemetry and artifact outputs

## Practical Reading Of The Current State

There are still three realistic target levels:

### 1. Keep `jsts-go` as a secondary JS/TS issue engine

The current branch is now much closer to this target. The main remaining risks are orphan/no-type behavior, compatibility transforms for reused upstream rule option shapes, and the sidecar failure window.

### 2. Make `jsts-go` a true JS/TS `analyze-project` replacement

This still requires closing the lifecycle gaps, adding untyped fallback behavior, and adding structured non-issue outputs.

### 3. Make `jsts-go` replace the full endpoint

This is still a much larger change. It would require either re-implementing or explicitly keeping elsewhere the current Node-owned responsibilities for:

- CSS analysis
- HTML/YAML and mixed-file routing
- bundle-provided rules and hooks
- AST and artifact production
- cache-aware downstream integration
