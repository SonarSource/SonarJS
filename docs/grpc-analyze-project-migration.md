# gRPC Analyze-Project Migration

## Date

2026-04-20

## Goal

Move the internal Java -> Node.js analyze-project communication from HTTP/WebSocket to a dedicated typed gRPC contract, remove the legacy JSON envelope, and keep the runtime lifecycle semantics required by SonarQube and SonarLint.

## Scope

- In scope:
  - SonarQube traditional scanner analyze-project flow.
  - SonarLint runtime lifecycle and cancellation semantics.
  - Standalone parser unary analyze-project flow.
  - Build-time proto generation and generated-artifact handling.
- Out of scope:
  - `LanguageAnalyzerService` and `language_analyzer.proto`.
  - Backward compatibility with the removed HTTP/WebSocket transport.

## Clarifications Captured From The Request

1. `LanguageAnalyzerService` stays unchanged.
2. `StandaloneParser` can be refactored.
3. Native gRPC patterns are preferred over preserving old HTTP/WebSocket behavior.
4. Any activity from Java should keep the runtime considered alive.
5. Cancellation must stop the in-flight Node analysis work, not only close the client stream.
6. Single-flight analysis remains the supported runtime model.
7. Insecure loopback gRPC is acceptable.
8. `SONARJS_EXISTING_NODE_PROCESS_PORT` should still support attaching Java to an already running Node process for debugging.
9. No transport backward compatibility is required. HTTP is dropped.
10. HTTP/WebSocket runtime dependencies should be removed in the same change.
11. Worker retention is a design choice, not a compatibility constraint.
12. The protocol should be designed around analyze-project needs, not around the external A3S contract.

## Final Protocol Design

### Service

`packages/grpc/src/proto/analyze-project.proto` defines the internal runtime API:

- `AnalyzeProject(AnalyzeProjectRequest) returns (stream AnalyzeProjectStreamResponse)`
- `AnalyzeProjectUnary(AnalyzeProjectRequest) returns (AnalyzeProjectUnaryResponse)`
- `CancelAnalysis(CancelAnalysisRequest) returns (CancelAnalysisResponse)`
- `Lease(stream LeaseRequest) returns (stream LeaseResponse)`

### Request

`AnalyzeProjectRequest` mirrors the internal analyze-project input, not `language_analyzer.proto`:

- `ProjectConfiguration configuration`
- `map<string, ProjectFileInput> files`
- `repeated JsTsRule rules`
- `repeated CssRule css_rules`
- `repeated string bundles`
- `optional string rules_workdir`

Key choices:

- The `files` map key is the canonical file path.
- `ProjectFileInput` no longer repeats `filePath`.
- Sparse requests remain accepted for manual clients such as `grpcurl`.

### Enums And Presence

Enums now use `_UNSPECIFIED = 0` where omission has meaning:

- `FILE_TYPE_UNSPECIFIED`
- `FILE_STATUS_UNSPECIFIED`
- `ANALYSIS_MODE_UNSPECIFIED`
- `JS_TS_LANGUAGE_UNSPECIFIED`

Presence is used where omitted vs explicit-empty matters:

- `StringList` wrapper messages are used for configuration lists such as `environments`, `globals`, suffix lists, and `js_ts_exclusions`.
- Optional scalars remain optional in the proto where current runtime semantics depend on omission.

### Responses

Streaming response is typed with `oneof`:

- `file_result`
- `meta`
- `cancelled`

Unary response is typed:

- `map<string, ProjectAnalysisFileResult> files`
- `ProjectAnalysisMeta meta`

`ProjectAnalysisFileResult.ast` is `bytes`, not base64.

Fatal request/runtime failures are surfaced as gRPC status errors. The old streamed JSON `error` event is removed.

## Node Boundary

### Removed

The analyze-project gRPC path no longer uses:

- `request_json`
- `message_json`
- `response_json`
- `JSON.parse`
- raw-object transport validation
- `sanitizeProjectAnalysisInput(raw)` as a gRPC entrypoint

### Added

`packages/grpc/src/analyze-project-normalize.ts` is now the typed adapter from protobuf input to internal analysis input.

It keeps only semantic normalization that protobuf cannot provide:

- normalize `base_dir`, `bundles`, `rules_workdir`, `ts_config_paths`, `fs_events`, and file-path keys
- require absolute `base_dir`
- initialize file stores from disk when `files` is omitted and filesystem access is allowed
- read file contents from disk when a file entry omits `file_content`
- infer `file_type` when it is unspecified
- default `file_status` to `SAME` when unspecified
- preserve existing configuration defaulting semantics
- apply ignore filtering and file-store initialization before `analyzeProject()`
- reject semantic invalid states protobuf cannot express, such as empty file-path keys or malformed rule entries

### Response Conversion

`packages/grpc/src/analyze-project-convert.ts` converts internal analysis output to typed protobuf responses.

It now handles:

- typed file results
- typed meta response
- typed cancelled response
- AST base64 -> protobuf bytes conversion
- per-file `error` payloads

## Java Boundary

### Bridge Surface

The bridge interface now uses generated analyze-project protobuf messages directly:

- `BridgeServer.analyzeProject(ProjectAnalysisHandler)` streams `AnalyzeProjectStreamResponse`
- `BridgeServer.analyzeProject(AnalyzeProjectRequest)` returns `AnalyzeProjectUnaryResponse`

The old analyze-project transport DTO layer has been removed from the bridge API surface.

### Request Construction

`sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/AnalyzeProjectMessages.java` is the thin Java-side protobuf builder/conversion helper.

It is responsible for:

- building `ProjectConfiguration`
- building `ProjectFileInput`
- converting `EslintRule` -> `JsTsRule`
- converting `StylelintRule` -> `CssRule`
- converting Java rule configuration objects to `google.protobuf.Value`

### Consumers Updated To Typed Messages

The main Java consumers now use generated protobuf messages directly:

- `WebSensor`
- `AnalysisProcessor`
- `PluginTelemetry`
- `QuickFixSupport`
- `ExternalIssueRepository`
- cache classes under `analysis/cache`
- `StandaloneParser`

AST bytes are decoded from protobuf bytes instead of going through base64.

## Runtime Lifecycle And Ownership

### Lease Model

The old heartbeat ping is replaced by a long-lived `Lease` stream.

- Java opens the lease only for the spawned `server.mjs` runtime that it owns.
- `grpc-server.mjs` / `LanguageAnalyzerService` is not affected.
- If the Java process exits and the gRPC connection closes, the lease ends and the owned Node runtime shuts down.
- When `SONARJS_EXISTING_NODE_PROCESS_PORT` is set, Java skips the lease entirely and does not own the external debug process.

### Startup And Shutdown

- A startup grace timeout still exists only before lease acquisition, so a freshly spawned runtime does not live forever if Java never connects.
- Java shutdown closes the same lease used for runtime ownership.
- This centralizes the previous heartbeat timeout and the old dedicated close endpoint into a single ownership mechanism.

### Cancellation

- Runtime analysis stays single-flight.
- Java cancellation triggers `CancelAnalysis`, and the Node worker stops the active analysis.
- Concurrent analyze-project requests are rejected with gRPC `RESOURCE_EXHAUSTED`.

### Worker Decision

The worker is retained for production runtime isolation and cancellation responsiveness.

At the same time, `startAnalyzeProjectServer(...)` supports running without a worker for unit tests and debugging, matching the old HTTP server behavior where analyze-project could execute in-process.

## Build And Generated Artifacts

### Java

- Java protobuf and gRPC sources for analyze-project are generated by `protobuf-maven-plugin` into `sonar-plugin/bridge/target/generated-sources`.
- These files are not committed.
- `.gitignore` already covers them via `target/`.

### Node

- Node protobuf JS/DTS artifacts are generated by `tools/generate-proto.ts`.
- They live in the source tree only as generated build artifacts and are gitignored:
  - `packages/grpc/src/proto/*.js`
  - `packages/grpc/src/proto/*.d.ts`
  - `packages/analysis/src/jsts/parsers/estree.js`
  - `packages/analysis/src/jsts/parsers/estree.d.ts`
- These files are regenerated by build/test commands such as `npm run bridge:compile`.
- They are copied into `lib/` for packaged execution.

### Coverage Exclusions

`sonar-plugin/bridge/pom.xml` excludes both generated protobuf trees from JaCoCo:

- `org/sonar/plugins/javascript/bridge/protobuf/*`
- `org/sonar/plugins/javascript/analyzeproject/grpc/*`

## Removed Transport Stack

The runtime HTTP/WebSocket path is intentionally dropped.

Removed pieces include:

- the legacy HTTP runtime package
- HTTP/WebSocket transport dependencies
- JSON envelope handling for analyze-project
- the legacy close endpoint for runtime shutdown

## Current Validation

Validated in this state:

1. `npm.cmd run bridge:compile`
   - Passes.
   - Confirms proto generation, app TypeScript compile, test TypeScript compile, and proto copy to `lib/`.
2. `mvn -pl sonar-plugin/javascript-checks,sonar-plugin/bridge -am "-Dmaven.test.skip=true" "-Dlicense.skip=true" install`
   - Passes.
   - Confirms generated Java protobuf/gRPC sources and bridge main compilation/package installation.
3. `mvn -pl sonar-plugin/sonar-javascript-plugin,sonar-plugin/standalone -am "-Dmaven.test.skip=true" "-Dlicense.skip=true" compile`
   - Passes.
   - Confirms the main Java plugin and standalone parser compile against the typed analyze-project contract.
