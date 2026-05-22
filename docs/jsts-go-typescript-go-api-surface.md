# jsts-go / TypeScript-Go API Surface Used by SonarJS

Date: 2026-05-20
Branch: `feat/tsgolint-grpc-poc`

## Scope

This document describes the current branch state after the Go analyzer runtime was centralized under `server-go/`.

Use it as the code-facing companion to:

- [node-vs-jsts-go-equivalence-assessment.md](./node-vs-jsts-go-equivalence-assessment.md)
- [jsts-go-migration-progress.md](./jsts-go-migration-progress.md)
- [ts7-jsts-go-poc-report.md](./ts7-jsts-go-poc-report.md)
- [../server-go/UPSTREAM.md](../server-go/UPSTREAM.md)

## Jira Alignment

`JS-1140` is now split. This document is most relevant to:

- `JS-1737` - own the Go analyzer runtime under `server-go`
- `JS-1738` - add the plugin-to-Go gRPC bridge and dual-runtime orchestration
- `JS-1739` - implement `analyze-project` core semantics in Go
- `JS-1745` - close remaining `analyze-project` and runtime parity gaps for migrated rules
- `JS-1760` - honor `analyze-project` globals and environments for scope-sensitive migrated rules
- `JS-1746` - migrate remaining type-service external and decorated rules
- `JS-1747` - migrate remaining type-service original SonarJS rules
- `JS-1749` - productize TS7 routing and packaging for SonarQube and SonarLint

## High-Level State

- `tsgolint` is no longer a git submodule or build/runtime dependency. It is now a reference implementation only. See [../server-go/UPSTREAM.md](../server-go/UPSTREAM.md).
- The live upstream-moving pieces are:
  - `server-go/typescript-go`
  - `server-go/patches/typescript-go`
  - `server-go/shim`
- Java still treats Node as the primary analyzer. The Go sidecar is a secondary JS/TS issue engine for the routed rule subset.
- `JsTsChecks.JSTS_GO_RULES` currently routes `60` Sonar rules to Go.
- The Go runtime exposes `61` rule entry points because `S6544` expands to:
  - `no-misused-promises`
  - `no-async-promise-executor`

## Routed Rule Set

Current Sonar-to-Go routing is defined in:

- [JsTsChecks.java](../sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/JsTsChecks.java)
- [rules.go](../server-go/sonar-server/rules.go)
- [requested_rules.go](../server-go/sonar-server/requested_rules.go)

Current routed Sonar keys now span the original pilot plus two parity-validated expansion batches, for `60` routed Sonar rules in total.

Use these as the source of truth for the full set:

- [JsTsChecks.java](../sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/JsTsChecks.java)
- [rules.go](../server-go/sonar-server/rules.go)
- [jsts-go-migration-progress.md](./jsts-go-migration-progress.md)

## Shared Analyze-Project Contract

The shared protobuf contract now lives in [packages/grpc/src/proto/analyze-project.proto](../packages/grpc/src/proto/analyze-project.proto).

The service definition includes:

- `AnalyzeProject`
- `AnalyzeProjectUnary`
- `CancelAnalysis`
- `Lease`

The same shared contract is implemented on both sides:

- Node: [packages/grpc/src/analyze-project-server.ts](../packages/grpc/src/analyze-project-server.ts) and [packages/grpc/src/analyze-project-server-lifecycle.ts](../packages/grpc/src/analyze-project-server-lifecycle.ts)
- Go: [server-go/sonar-server/service.go](../server-go/sonar-server/service.go)

Important distinction:

- Java's [AnalyzerGrpcServerImpl.java](../sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/grpc/AnalyzerGrpcServerImpl.java) currently calls the streaming `AnalyzeProject` RPC only.
- Its `isAlive()` method is a local process/channel liveness check. It is not a gRPC RPC and should not be confused with the older PoC wording that mentioned an `IsAlive` endpoint.

## Java Call Paths

The Java scanner has two distinct consumers of the shared `AnalyzeProjectRequest` shape:

### 1. Node primary path

[WebSensor.java](../sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/WebSensor.java) builds the full Node request in `AnalyzeProjectHandler#getRequest()` and sends:

- `configuration`
- `files`
- JS/TS `rules`
- `cssRules`

When the Go sidecar is alive, Node receives `enabledBridgeEslintRules()`, which excludes the routed Go keys.

### 2. Go sidecar path

The same `WebSensor` builds the sidecar request in `createJstsGoRequest()` and sends:

- `configuration`
- `files`
- routed JS/TS `rules`

It does not currently send:

- `cssRules`
- `bundles`
- `rulesWorkdir`

The sidecar runs after Node bridge analysis and imports issues directly through `AnalysisProcessor`.

## Request Normalization And Consumption

The shared request-normalization logic on the Node side now lives in [packages/grpc/src/analyze-project-normalize.ts](../packages/grpc/src/analyze-project-normalize.ts).

That normalization layer accepts and validates:

- `configuration`
- file map input, including inline `fileContent`
- JS/TS rules
- CSS rules
- `bundles`
- `rulesWorkdir`

On the Go side, the analogous normalization/runtime split now lives under:

- [normalize.go](../server-go/sonar-server/normalize.go)
- [filesystem.go](../server-go/sonar-server/filesystem.go)
- [file_stores.go](../server-go/sonar-server/file_stores.go)
- [path_patterns.go](../server-go/sonar-server/path_patterns.go)
- [dependency_signals.go](../server-go/sonar-server/dependency_signals.go)
- [requested_rules.go](../server-go/sonar-server/requested_rules.go)
- generated `generated_rule_metadata.go` data produced by [tools/generate-go-rule-metadata.ts](../tools/generate-go-rule-metadata.ts)

Unlike the older PoC state, the Go runtime now actively consumes normalized configuration and file metadata, including:

- `tsConfigPaths`
- JS/TS suffixes
- sources/tests/inclusion/exclusion filters
- `canAccessFileSystem`
- `createTSProgramForOrphanFiles`
- `disableTypeChecking`
- file type and file status
- manifest-derived dependency and module-type signals

## Current Go Runtime Layers

The current Go stack is split into these layers:

### Service and orchestration

- [service.go](../server-go/sonar-server/service.go)
- [service_lifecycle.go](../server-go/sonar-server/service_lifecycle.go)

### Request normalization and project discovery

- [normalize.go](../server-go/sonar-server/normalize.go)
- [filesystem.go](../server-go/sonar-server/filesystem.go)
- [file_stores.go](../server-go/sonar-server/file_stores.go)
- [path_patterns.go](../server-go/sonar-server/path_patterns.go)
- [dependency_signals.go](../server-go/sonar-server/dependency_signals.go)
- [internal/utils/find_tsconfig.go](../server-go/sonar-server/internal/utils/find_tsconfig.go)
- [internal/utils/overlay_vfs.go](../server-go/sonar-server/internal/utils/overlay_vfs.go)

### Rule configuration, metadata, and decorators

- [rules.go](../server-go/sonar-server/rules.go)
- [requested_rules.go](../server-go/sonar-server/requested_rules.go)
- generated `generated_rule_metadata.go` data produced by [tools/generate-go-rule-metadata.ts](../tools/generate-go-rule-metadata.ts)
- [decorator_test.go](../server-go/sonar-server/decorator_test.go)

### Rule execution runtime

- [internal/linter](../server-go/sonar-server/internal/linter)
- [internal/rule](../server-go/sonar-server/internal/rule)
- [internal/rules](../server-go/sonar-server/internal/rules)

### TypeScript-Go coupling

- [../server-go/shim](../server-go/shim)
- [../server-go/patches/typescript-go](../server-go/patches/typescript-go)
- [../server-go/typescript-go](../server-go/typescript-go)

## Current Node Runtime Layers

The current Node implementation is split between the gRPC host in `packages/grpc` and the analysis engine in `packages/analysis`:

### Shared gRPC host and normalization

- [packages/grpc/src/analyze-project-server.ts](../packages/grpc/src/analyze-project-server.ts)
- [packages/grpc/src/analyze-project-server-lifecycle.ts](../packages/grpc/src/analyze-project-server-lifecycle.ts)
- [packages/grpc/src/analyze-project-normalize.ts](../packages/grpc/src/analyze-project-normalize.ts)

### Analysis engine

- [packages/analysis/src/analyzeProject.ts](../packages/analysis/src/analyzeProject.ts)
- [packages/analysis/src/analyzeWithProgram.ts](../packages/analysis/src/analyzeWithProgram.ts)
- [packages/analysis/src/analyzeWithIncrementalProgram.ts](../packages/analysis/src/analyzeWithIncrementalProgram.ts)
- [packages/analysis/src/analyzeWithoutProgram.ts](../packages/analysis/src/analyzeWithoutProgram.ts)
- [packages/analysis/src/file-stores](../packages/analysis/src/file-stores)
- [packages/analysis/src/jsts/linter](../packages/analysis/src/jsts/linter)
- [packages/analysis/src/jsts/program](../packages/analysis/src/jsts/program)
- [packages/analysis/src/jsts/parsers](../packages/analysis/src/jsts/parsers)

## What Still Stays Node-Owned

Even with the current Go sidecar, Node remains authoritative for:

- CSS analysis
- HTML/YAML embedded JS analysis
- Vue parsing and template semantics
- Babel parser fallback
- AST, highlights, metrics, symbols, and CPD outputs
- telemetry and the richer non-issue result surface on the primary endpoint

That split is still deliberate and matches the current secondary issue-engine scope described in [node-vs-jsts-go-equivalence-assessment.md](./node-vs-jsts-go-equivalence-assessment.md).

## Practical Current Deltas

The main mismatches to keep in mind when reading the code today are:

1. The shared proto surface is broader than the Java sidecar client currently exercises.
2. The Go runtime supports much more request normalization and project semantics than the older PoC docs described.
3. The Go side still returns issues only for the sidecar path.
4. `tsgolint` ancestry still matters for some internal runtime code, but the repository no longer tracks or consumes `tsgolint` as a dependency.

## Recommended Reading Order

1. [node-vs-jsts-go-equivalence-assessment.md](./node-vs-jsts-go-equivalence-assessment.md) for current behavior and remaining runtime gaps
2. [jsts-go-migration-progress.md](./jsts-go-migration-progress.md) for rule inventory and migration planning
3. [../server-go/UPSTREAM.md](../server-go/UPSTREAM.md) for current ownership and upstream policy
4. [ts7-jsts-go-poc-report.md](./ts7-jsts-go-poc-report.md) only as a historical PoC baseline
