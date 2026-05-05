# Node `analyze-project` vs `tsgolint` Equivalence Assessment

Date: 2026-05-04
Branch: `feat/tsgolint-grpc-poc`

## Scope

This document compares:

1. The current Node.js `AnalyzeProject` runtime and analysis pipeline.
2. The current Java wrapper around `tsgolint` plus the Go `tsgolint` server/internals.

The comparison starts at the internal `AnalyzeProject` gRPC request and follows the flow until Node reaches ESLint rule execution, then contrasts that with the current `tsgolint` path.

The goal is not just API-shape parity. "Equivalent" here means matching the observable behavior that Java and the rest of SonarJS rely on:

- runtime lifecycle
- cancellation and single-flight semantics
- request normalization and file-model semantics
- program creation behavior
- rule-routing and dynamic enable/disable behavior
- outputs, metadata, and downstream integration

## High-Level Conclusion

The current `tsgolint` path is not an `analyze-project` equivalent yet. It is an issue-only secondary pass for a fixed subset of JS/TS rules, while Node remains the full analyzer runtime.

The biggest gaps are:

- the Go service ignores most of the rich request surface already sent by Java
- Node has typed vs untyped execution branches that `tsgolint` does not mirror
- Node applies per-file dynamic rule filtering before ESLint; `tsgolint` currently does not
- Node produces much more than issues: parsing errors, per-file runtime errors, metrics, highlights, symbols, CPD, AST, telemetry, cache-aware behavior
- Node runtime lifecycle semantics include single-flight analysis, real cancellation, worker support, and lease-based ownership; the Go path does not

## Evidence Base

Main code paths inspected for this assessment:

- Node transport/runtime:
  - `packages/grpc/src/analyze-project-server.ts`
  - `packages/grpc/src/analyze-project-server-lifecycle.ts`
  - `packages/grpc/src/analyze-project-normalize.ts`
  - `packages/grpc/src/analyze-project-handle-request.ts`
- Node analysis core:
  - `packages/analysis/src/analyzeProject.ts`
  - `packages/analysis/src/analyzeWithProgram.ts`
  - `packages/analysis/src/analyzeWithIncrementalProgram.ts`
  - `packages/analysis/src/analyzeWithoutProgram.ts`
  - `packages/analysis/src/analyzeFile.ts`
  - `packages/analysis/src/jsts/analysis/analyzer.ts`
  - `packages/analysis/src/jsts/linter/linter.ts`
- Java wrapper / sensor:
  - `sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/WebSensor.java`
  - `sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/JsTsChecks.java`
  - `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeServerImpl.java`
  - `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/grpc/AnalyzerGrpcServerImpl.java`
  - `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/AnalyzeProjectMessages.java`
- Go wrapper / `tsgolint` internals:
  - `sonar-plugin/bridge/src/main/go/sonar-server/service.go`
  - `sonar-plugin/bridge/src/main/go/sonar-server/requested_rules.go`
  - `sonar-plugin/bridge/src/main/go/sonar-server/rules.go`
  - `sonar-plugin/bridge/src/main/go/sonar-server/converter.go`
  - `tsgolint/internal/linter/linter.go`
  - `tsgolint/internal/utils/create_program.go`
  - `tsgolint/internal/utils/find_tsconfig.go`

## Table Legend

- `Area`: behavior/responsibility being compared.
- `Node today`: what the current Node `analyze-project` runtime and `packages/analysis` actually do.
- `Wrapper + tsgolint today`: what the Java wrapper plus Go server currently do.
- `Work for equivalence`: what would need to change if we wanted the `tsgolint` path to behave like Node for that area.

Work sizing uses this shorthand:

- `None`: already equivalent for practical purposes.
- `Small`: mostly adapter work.
- `Medium`: meaningful implementation work, but localized.
- `Large`: structural/runtime behavior change.
- `Out of scope`: only needed if `tsgolint` is meant to replace the full endpoint instead of staying a secondary JS/TS engine.

## Comparison Matrix

| Category         | Area                                             | Node today                                                                                                                                                                                  | Wrapper + `tsgolint` today                                                                                                                                                               | Work for equivalence                                                                                                                                         |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime          | RPC shape                                        | Exposes streaming `AnalyzeProject`, unary `AnalyzeProjectUnary`, `CancelAnalysis`, and `Lease`.                                                                                             | Exposes the same RPC names, but the Go implementation is much thinner.                                                                                                                   | `Small`: API shape already matches.                                                                                                                          |
| Runtime          | Single-flight analysis                           | Enforces one in-flight analysis across both streaming and unary calls; overlap returns `RESOURCE_EXHAUSTED`.                                                                                | No equivalent single-flight guard in the Go service. Java starts one sidecar process per sensor execution, but the service itself does not enforce Node-style single-flight semantics.   | `Medium`: add explicit server-side single-flight semantics or keep this ownership entirely on the Java side with equivalent guarantees.                      |
| Runtime          | Cancellation                                     | Real cancellation path: stream cancellation triggers `CancelAnalysis`, public `CancelAnalysis` reports whether an active analysis was cancelled, shutdown also tries to cancel active work. | `CancelAnalysis` always returns `cancelled=false`. No meaningful cancellation propagation inside the Go analyzer.                                                                        | `Large`: implement cancellable analysis context throughout the Go path and wire it to the RPC.                                                               |
| Runtime          | Lease / child lifetime                           | Lease is part of runtime ownership. Losing the lease shuts down the Node runtime.                                                                                                           | `Lease` just drains the stream until EOF/error; no ownership semantics are attached to it.                                                                                               | `Large`: either implement lease-based ownership in Go or explicitly decide that Java alone owns the process and no longer expects Node-like lease semantics. |
| Runtime          | Worker/current-thread mode                       | Supports production worker-thread execution and in-process execution for tests/debugging.                                                                                                   | No equivalent dual-mode design; the Go server is a plain process.                                                                                                                        | `Small`: probably not needed unless test/debug ergonomics need parity.                                                                                       |
| Runtime          | Startup timeout / lifecycle                      | Startup timeout exists until lease acquisition; shutdown is centralized and cancels in-flight work, closes lease, and tears down worker/server.                                             | Java starts the Go binary, waits for channel readiness, and kills the process on stop; no startup lease semantics.                                                                       | `Medium`: enough for a secondary sidecar; `Large` for full Node-lifecycle parity.                                                                            |
| Runtime          | Error mapping                                    | Invalid request vs runtime failure are normalized and mapped to gRPC status consistently.                                                                                                   | Basic gRPC errors only; much less request normalization means fewer semantic invalid-request checks.                                                                                     | `Medium`: implement equivalent request validation and status mapping.                                                                                        |
| Runtime          | Memory / OOM observability                       | Logs OS/Docker/Node heap config, supports debug GC/heap logging, special OOM guidance.                                                                                                      | No equivalent memory diagnostics or structured OOM behavior.                                                                                                                             | `Medium`: add basic diagnostics if Go becomes more than a best-effort sidecar.                                                                               |
| Request          | Request normalization                            | Validates config, rules, enums, paths, omitted-vs-empty semantics, `Long`/structured-clone int64, empty map quirks, and builds a `pathMap`.                                                 | Mostly trusts request as-is; normalizes file-path slashes and defaults `baseDir` to `"."` if missing.                                                                                    | `Large`: implement full request normalization if parity is required.                                                                                         |
| Request          | Files omitted from request                       | If files are omitted and filesystem access is allowed, Node resets stores and discovers files from disk.                                                                                    | The Go service only iterates `req.files`; omitted files mean no analysis.                                                                                                                | `Large`: implement the same discovery behavior or keep Java always materializing the full file set.                                                          |
| Request          | Explicit file map with inline contents           | Uses request-provided `fileContent` when present, else reads from disk; preserves original request keys through `pathMap`.                                                                  | Ignores `fileContent`; effectively uses only file-path keys and reads from disk through `osvfs`.                                                                                         | `Large`: use an overlay/in-memory VFS so request contents actually drive analysis.                                                                           |
| Request          | `canAccessFileSystem=false` mode                 | Simulates filesystem traversal from input files and keeps tsconfig/dependency logic working without disk access.                                                                            | No equivalent mode; current Go path assumes local filesystem access.                                                                                                                     | `Large`: implement overlay VFS + no-FS resolution semantics.                                                                                                 |
| Request          | `fileType` (`MAIN` vs `TEST`)                    | Drives rule filtering, metrics behavior, CPD behavior, CSS behavior, and additional internal metrics logic.                                                                                 | Java sends `fileType`, but Go ignores it.                                                                                                                                                | `Large`: propagate file type into rule execution and result shaping.                                                                                         |
| Request          | `fileStatus` and `analysisMode`                  | `SAME` vs `CHANGED/ADDED` interacts with `SKIP_UNCHANGED`; changed files are forced back to default analysis mode for rule selection.                                                       | Java sends `fileStatus`, but Go ignores it. No equivalent `SKIP_UNCHANGED` behavior.                                                                                                     | `Large`: add file-status-aware rule gating or explicitly keep this behavior in Node only.                                                                    |
| Request          | Environments / globals                           | Passed to ESLint linter initialization and influence rule execution.                                                                                                                        | Java sends them in config; Go ignores them.                                                                                                                                              | `Large` if full ESLint-equivalent semantics are expected. `Out of scope` if Go only runs rules that do not depend on those concepts.                         |
| Request          | Suffix lists / custom extensions                 | Node respects configured JS/TS/CSS/HTML/YAML suffixes and additional CSS suffixes.                                                                                                          | Java sends suffixes; Go ignores them and infers language mostly from actual file paths/extensions.                                                                                       | `Medium`: needed if Go must mirror Node file classification.                                                                                                 |
| Request          | Bundles / `rulesWorkdir` / hook rules            | Node loads external rule bundles and passes `workDir` to rules that need filesystem context.                                                                                                | `tsgolint` request does not use bundles or `rulesWorkdir`; Go rules are statically compiled.                                                                                             | `Out of scope` for current secondary typed-rule offload. `Large` if Go is meant to replace the full Node endpoint.                                           |
| Request          | CSS rules                                        | Node request can carry CSS rules and analyze CSS or CSS-in-mixed-files.                                                                                                                     | Go path ignores CSS rules entirely.                                                                                                                                                      | `Out of scope` unless Go is expected to replace the full endpoint.                                                                                           |
| Input model      | Local file filtering before analysis             | Node file stores apply exclusions, file-type classification, bundle/minified checks, max-file-size rules, and ignore logic during discovery/sanitization.                                   | Go path receives the Java-selected file set, but does not replicate Node-side local discovery/filter rules.                                                                              | `Medium`: acceptable for current Java-driven file selection; `Large` if Go must match standalone Node semantics.                                             |
| Programs         | Top-level execution strategy                     | Chooses among incremental typed analysis, batch typed analysis, and untyped fallback based on config and context.                                                                           | Always builds Go workloads from tsconfig resolution and runs `tsgolint`; there is no Node-like strategy switch.                                                                          | `Large`: this is one of the main semantic gaps.                                                                                                              |
| Programs         | SonarLint incremental typed path                 | Uses cached incremental `SemanticDiagnosticsBuilderProgram`s, reuses programs across requests, and updates only when file contents change.                                                  | No equivalent SonarLint incremental mode. The Go server is started/stopped around the sensor run and does not preserve typed-program state the same way.                                 | `Large`: implement a persistent cache/incremental model or accept that SonarLint parity is missing.                                                          |
| Programs         | SonarQube batch typed path                       | Walks tsconfigs, creates standard `ts.Program`s, discovers project references, analyzes typed files, then clears caches after run.                                                          | Resolves tsconfigs in parallel, builds a `Workload`, and runs `tsgolint` programs from that. No cache-clear semantics because there is no equivalent Node cache layer.                   | `Medium`: tsconfig batching exists, but behavior is not equivalent yet.                                                                                      |
| Programs         | `tsConfigPaths` vs lookup discovery              | Provided tsconfig paths override lookup results when found; lookup mode scans discovered `tsconfig.json` files; FS events can invalidate caches.                                            | `tsgolint` resolves tsconfig from file paths and follows project references/ancestor configs; it does not honor the full Node `tsConfigPaths` selection policy from the request.         | `Large`: honor request-configured tsconfig selection and invalidation semantics.                                                                             |
| Programs         | Project references                               | Node adds discovered referenced tsconfigs and analyzes through them.                                                                                                                        | `tsgolint` also follows project references during config resolution/program creation.                                                                                                    | `Small`: concept exists on both sides, but exact selection rules still differ.                                                                               |
| Programs         | Orphan-file behavior                             | Can optionally create a TS program for orphan files; if disabled, it warns and later analyzes them without type info.                                                                       | Unmatched files always go through an inferred typed program.                                                                                                                             | `Large`: make orphan handling configurable and support the untyped fallback path.                                                                            |
| Programs         | `disableTypeChecking`                            | Completely skips typed-program creation and analyzes everything without type info.                                                                                                          | No equivalent.                                                                                                                                                                           | `Large`: implement a no-type mode or explicitly keep such rules in Node.                                                                                     |
| Programs         | Inferred-program defaults                        | When Node creates orphan programs, it merges discovered compiler options when available, else uses Node defaults plus computed libs.                                                        | `tsgolint` inferred programs use hardcoded Go defaults (`ESNext`/`Bundler`, strict flags, React JSX, etc.).                                                                              | `Medium`: align defaults if equivalent diagnostics are required.                                                                                             |
| Parsing          | Parser selection before rule execution           | Node chooses TS parser, Babel parser, Vue parser, and JS module/script fallback based on language/extension/config.                                                                         | `tsgolint` uses TypeScript-go programs directly; there is no ESLint parser-selection layer or Babel fallback.                                                                            | `Large`: only needed if Go is meant to cover Node's parser-driven JS/TS surface rather than a typed TS subset.                                               |
| Dispatch         | Non-JS/TS routing                                | Node dispatches CSS, HTML, YAML, JS/TS, and mixed Vue/HTML+CSS appropriately.                                                                                                               | Java wrapper only sends JS/TS files to `tsgolint`; non-JS/TS stays on Node.                                                                                                              | `Out of scope` for current split design. `Large` for full endpoint replacement.                                                                              |
| Rules            | Rule partitioning between engines                | Node can execute all active bridge rules plus hooks/bundles.                                                                                                                                | Java partitions a fixed Sonar-key subset to `tsgolint`; all other rules stay on Node.                                                                                                    | `None` for the current split design. `Large` if the goal changes to broader migration.                                                                       |
| Rules            | Per-file dynamic enable/disable before execution | Node filters rules by file type, analysis mode, language, blacklisted extension, required dependency, React-on-Vue suppression, required ECMAScript version, and required module type.      | No equivalent wrapper-side or Go-side per-file filter pipeline. Same configured rule list is returned for every source file.                                                             | `Large`: one of the main semantic gaps.                                                                                                                      |
| Rules            | Dependency-aware behavior                        | Node reads dependency manifests and only enables some rules when required dependencies are present.                                                                                         | No equivalent dependency-manifest-aware gating in Go.                                                                                                                                    | `Large`: add manifest scanning/filtering or keep such rules on Node.                                                                                         |
| Rules            | React/Vue suppression                            | Node disables React-specific rules on `.vue` files.                                                                                                                                         | No equivalent.                                                                                                                                                                           | `Medium` if such rules migrate to Go; otherwise not needed yet.                                                                                              |
| Rules            | ECMAScript and module-type gating                | Node detects effective ES year and module type, then filters rules accordingly.                                                                                                             | No equivalent request/config-driven filter stage.                                                                                                                                        | `Large` if migrated rules rely on these gates.                                                                                                               |
| Rules            | Hidden internal metrics rules                    | Node injects silent cognitive-complexity execution for SonarQube MAIN files to compute internal metrics.                                                                                    | No equivalent.                                                                                                                                                                           | `Out of scope` unless Go is expected to own metrics too.                                                                                                     |
| Rules            | External bundles / hooks                         | Node can load bundle-defined rules and execute hooks that are not standard quality-profile rules.                                                                                           | No equivalent in Go.                                                                                                                                                                     | `Out of scope` for current typed-rule sidecar.                                                                                                               |
| Rules            | Rule-config conversion                           | Node already receives proto `Value` configs and hands them to ESLint rules after existing transformations/defaulting.                                                                       | Go converts `Value` to `interface{}` and additionally overlays Sonar defaults for `S131`, `S6544`, `S6606`, and expands `S6544` with `no-async-promise-executor`.                        | `Small`: this part is reasonably aligned for the currently mapped rules.                                                                                     |
| Output           | Issues                                           | Node returns issues as part of full per-file results.                                                                                                                                       | Go returns issues only.                                                                                                                                                                  | `None` for issue-only offload; `Out of scope` if issues are the only intended result.                                                                        |
| Output           | Parsing errors                                   | Node returns structured parsing errors and Java turns them into parse-error issues plus analysis errors.                                                                                    | No equivalent structured parsing-error channel from Go.                                                                                                                                  | `Large` if Go is meant to replace Node for JS/TS analysis.                                                                                                   |
| Output           | Per-file runtime errors                          | Node can return per-file `error` results and Java persists them as analysis errors without killing the whole project analysis.                                                              | No equivalent per-file runtime-error result path. Top-level errors only become warning strings or RPC failure.                                                                           | `Large`: implement file-level error reporting.                                                                                                               |
| Output           | Metrics / `NOSONAR` / CPD / highlights / symbols | Node returns these artifacts and Java imports them. Behavior differs correctly for SonarLint vs SonarQube and MAIN vs TEST.                                                                 | No equivalent. Go meta only contains warnings.                                                                                                                                           | `Large`: required for full JS/TS endpoint parity.                                                                                                            |
| Output           | AST                                              | Node can serialize AST unless `skipAst` is set, and Java consumes it for downstream consumers/cache.                                                                                        | No equivalent AST output.                                                                                                                                                                | `Large`: required if any downstream consumer still depends on AST from the migrated files.                                                                   |
| Output           | Quick fixes                                      | Node issue model can carry quick fixes.                                                                                                                                                     | Current Go converter does not produce them.                                                                                                                                              | `Medium` if migrated rules can or should offer quick fixes.                                                                                                  |
| Output           | Telemetry                                        | Node emits TypeScript signals, compiler options, ES versions, program-creation stats, and ESM/CJS counts in `meta.telemetry`.                                                               | No equivalent telemetry in Go meta.                                                                                                                                                      | `Medium`: implement if telemetry continuity matters.                                                                                                         |
| Output           | Warnings/meta                                    | Node returns warnings plus telemetry.                                                                                                                                                       | Go returns warnings only, and mainly from top-level linter failure. Internal diagnostics are only logged.                                                                                | `Medium`: enrich meta if parity matters.                                                                                                                     |
| Java integration | Cache integration                                | Node bridge results participate in cache strategy handling and AST/CPD cache writes.                                                                                                        | `tsgolint` issues are imported directly; no equivalent cache/artifact integration.                                                                                                       | `Large` if Go takes over more than issue reporting.                                                                                                          |
| Java integration | External issue dedupe path                       | Node results go through the main `AnalyzeProjectHandler` path, which also deduplicates external ESLint-imported issues.                                                                     | `tsgolint` bypasses most of that path and directly saves imported issues.                                                                                                                | `Medium`: fine for current scope, but not equivalent if sidecar becomes primary.                                                                             |
| Java integration | Sidecar failure semantics                        | Node bridge failure is fatal to JS/TS analysis.                                                                                                                                             | `tsgolint` failure is best-effort: log and continue without sidecar issues.                                                                                                              | `None` for current secondary design. `Large` if Go becomes required.                                                                                         |
| Java integration | Crash window after rule partitioning             | Not applicable when Node is sole executor.                                                                                                                                                  | If rules are removed from Node because `tsgolint` looked alive when the bridge request was built, then `tsgolint` dies before/during its run, those rules can be lost for that analysis. | `Medium`: either freeze sidecar health earlier/later, retry on Node, or partition only after sidecar success is guaranteed.                                  |

## Prioritized Parity Gaps

If the goal is a true JS/TS `analyze-project` equivalent on the Go side, the main blockers are:

1. Request/file-model parity
   - honor `fileContent`
   - support `canAccessFileSystem=false`
   - honor `fileType`, `fileStatus`, `analysisMode`, configured tsconfig selection, and suffix/file-model semantics

2. Program-creation parity
   - support Node's typed vs untyped branching
   - support `disableTypeChecking`
   - support configurable orphan handling instead of always creating inferred typed programs
   - decide how SonarLint incremental typed reuse would work

3. Rule-routing parity
   - replicate Node's per-file pre-rule filtering, especially dependency/module/ES/version/file-type gates
   - decide what happens with hook rules and bundle-provided rules

4. Output parity
   - parsing errors
   - per-file runtime errors
   - metrics/highlights/symbols/CPD/AST
   - telemetry
   - quick fixes if needed

5. Runtime-lifecycle parity
   - single-flight behavior
   - real cancellation
   - lease/lifetime ownership, if that contract remains part of the runtime

## Practical Reading Of The Current State

There are three realistic target levels:

### 1. Keep `tsgolint` as a narrow secondary issue engine

This is the current design. In that model, the missing pieces above are acceptable as long as:

- only rules that do not depend on the missing semantics are offloaded
- Node remains authoritative for all non-issue outputs and all non-JS/TS analysis
- sidecar failures do not silently drop issues after rule partitioning

### 2. Make `tsgolint` a true JS/TS `analyze-project` replacement

This requires closing the major gaps around file-model semantics, typed/untyped behavior, dynamic rule filtering, structured outputs, and runtime lifecycle.

### 3. Make `tsgolint` replace the full endpoint

This goes beyond JS/TS typed-rule parity and would require replacing or retaining elsewhere the current Node-owned responsibilities for:

- CSS/stylelint analysis
- HTML/YAML embedded analysis
- mixed-file CSS handling
- bundle-provided rules and ESLint hooks
- AST-driven downstream consumers

That is a much larger change than "make the current Go sidecar behave like Node for the currently offloaded rules."
