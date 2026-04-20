# Java to Node.js Runtime Migration to gRPC

## Date

2026-04-18

## Goal

Unify Java <-> Node.js runtime communication on gRPC for SonarQube scanner and SonarLint contexts, and remove runtime HTTP/WebSocket transports.

## Inputs and Clarifications

1. Keep `LanguageAnalyzerService` unchanged (Docker/A3S path remains intact).
2. `StandaloneParser` implementation can be refactored if needed.
3. Prefer native gRPC patterns over preserving old HTTP/WebSocket mechanics.
4. The runtime must shut down when Java disappears, and any remaining timeout logic should be kept only where it still adds value.
5. Cancellation must stop in-process analysis work, not only close the client stream.
6. Runtime remains single-flight per Node worker.
7. Insecure loopback gRPC is acceptable.
8. Preserve `SONARJS_EXISTING_NODE_PROCESS_PORT` behavior if feasible.
9. No HTTP backward compatibility required.
10. Remove HTTP/WebSocket dependencies in the same PR.
11. Keep worker vs single-process decision pragmatic.
12. Naming should move away from `bridge`; user explicitly suggested `analyze-project.proto`.

## Final Architecture

### Services

- Existing service unchanged:
  - `analyzer.LanguageAnalyzerService` (`language_analyzer.proto`)
- New runtime service:
  - `sonarjs.analyzeproject.v1.AnalyzeProjectService` (`analyze-project.proto`)

### New Runtime gRPC API

- `AnalyzeProject(AnalyzeProjectRequest) -> stream AnalyzeProjectStreamResponse`
  - Scanner/SonarLint streaming path (incremental messages).
- `AnalyzeProjectUnary(AnalyzeProjectRequest) -> AnalyzeProjectUnaryResponse`
  - Unary compatibility path (used by existing unary Java call sites).
- `CancelAnalysis(CancelAnalysisRequest) -> CancelAnalysisResponse`
  - Requests in-worker cancellation.
- `Lease(stream LeaseRequest) -> stream LeaseResponse`
  - Long-lived ownership stream tying the Node.js process lifetime to the Java process lifetime.

### Payload Strategy

- Keep protobuf envelopes with JSON strings:
  - `request_json`, `message_json`, `response_json`.
- Rationale:
  - preserves existing analysis payload shape,
  - minimizes high-risk field-by-field schema migration,
  - keeps Java/Node refactor focused on transport.

### Lifecycle, Heartbeat, and Timeout Semantics

- Java opens a long-lived `Lease` stream as soon as the gRPC channel is ready, but only for the
  spawned `server.mjs` runtime that Java owns.
- The lease is transport-level ownership only: no periodic ping messages are required and no
  application-level lease payloads need to be exchanged. Keeping the stream open is the signal.
- If Java shuts down or the channel breaks, the `Lease` stream ends and the spawned Node runtime
  shuts down immediately.
- No periodic heartbeat RPC is required.
- A startup grace timeout remains only to cover the narrow window before Java acquires the lease after spawning Node.
- Java shutdown now uses the same lease closure mechanism to stop the owned Node runtime, replacing
  both the previous heartbeat timeout dependency and the old dedicated `/close` HTTP endpoint.
- `SONARJS_EXISTING_NODE_PROCESS_PORT` remains supported as a connection target for debugging, and
  in that mode Java skips the lease entirely so the external process is not owned or shut down by
  the scanner.
- `grpc-server.mjs` / `LanguageAnalyzerService` remains outside this lifecycle and is unaffected.

### Cancellation Semantics

- Single-flight analysis per worker.
- Stream cancellation from Java triggers `CancelAnalysis` in Node.
- Explicit Java `CancelAnalysis` also cancels in-worker analysis loop.

### Worker Decision

- Worker retained.
- Rationale:
  - isolates heavy analysis from gRPC control plane,
  - keeps cancellation/timeout handling responsive,
  - lowers risk of event-loop starvation during large scans.
- `server.mjs` keeps using the worker-backed production mode, but `startAnalyzeProjectServer(...)`
  also supports running without a worker for tests and debugging, matching the old HTTP server
  behavior where requests could execute in-process.

## Implemented Changes

### Node.js Runtime

- Added new runtime proto:
  - `packages/grpc/src/proto/analyze-project.proto`
- Added/renamed runtime implementation to analyze-project naming:
  - `packages/grpc/src/analyze-project-server.ts`
  - `packages/grpc/src/analyze-project-handle-request.ts`
  - `packages/grpc/src/analyze-project-request.ts`
  - `packages/grpc/src/analyze-project-memory.ts`
  - `packages/grpc/src/analyze-project-worker.ts`
  - `packages/grpc/src/analyze-project-worker/create-worker.ts`
  - `packages/grpc/src/analyze-project-worker/messages.ts`
- `server.mjs` now starts analyze-project gRPC runtime server + worker.
- `startAnalyzeProjectServer(...)` accepts an optional worker and falls back to in-process handling
  for unary analysis, streaming analysis, cancellation, and shutdown when no worker is provided.
- Proto generation wiring updated in `tools/generate-proto.ts`.
- Removed obsolete generated runtime proto artifacts:
  - `packages/grpc/src/proto/bridge.js`
  - `packages/grpc/src/proto/bridge.d.ts`
- Removed the old inactivity-timeout helper and replaced it with lease-driven ownership plus a startup grace timeout.

### Java Runtime Client

- `BridgeServerImpl` migrated from HTTP/WebSocket runtime calls to gRPC calls against `AnalyzeProjectService`.
- `BridgeServerImpl` now uses generated Java gRPC stubs for `AnalyzeProjectService` instead of
  handwritten `MethodDescriptor` wiring.
- `analyzeProject(WebSocketMessageHandler)` now consumes gRPC stream messages.
- `analyzeProject(ProjectAnalysisRequest)` now uses gRPC unary.
- Java now waits for channel readiness, then opens a long-lived lease stream only for spawned
  analyzer runtimes.
- `isAlive()` now reflects channel readiness for external debug runtimes and channel readiness plus
  lease state for spawned runtimes.
- `clean()` closes the lease and channel for spawned runtimes, letting Node shut itself down from
  lease loss, while external debug runtimes are left running.
- This centralizes graceful shutdown for owned runtimes on the lease path instead of keeping a
  separate runtime-specific shutdown RPC or HTTP endpoint.
- Added gRPC channel lifecycle management.
- Analyze-project RPCs now run without per-call gRPC deadlines so full-project analysis is not cut
  off by a transport timeout.
- On startup timeout, the Java side now closes the gRPC channel and force-stops the Node process immediately instead of waiting for later cleanup.
- Shutdown now closes the gRPC channel before waiting for process termination, which avoids tests hanging on lingering runtime resources.
- Removed now-unused `Http.java` transport helper.

### Java Dependency and Build Updates

- `sonar-plugin/bridge/pom.xml`:
  - added gRPC Java dependencies (`grpc-okhttp`, `grpc-protobuf`, `grpc-stub`),
  - added `javax.annotation-api` required by generated gRPC Java stubs,
  - removed Java-WebSocket dependency,
  - added protobuf generation for `analyze-project.proto`,
  - added gRPC stub generation for `analyze-project.proto`.

### Generated Protobuf Artifacts

- Java protobuf sources remain build-generated only through Maven into `target/generated-sources`.
- Java gRPC stub sources for `analyze-project.proto` are also build-generated only through Maven
  into `target/generated-sources`.
- Node protobuf JS/DTS artifacts remain source-tree build artifacts, but they are not tracked by git:
  - `packages/grpc/src/proto/*.js`
  - `packages/grpc/src/proto/*.d.ts`
  - `packages/analysis/src/jsts/parsers/estree.js`
  - `packages/analysis/src/jsts/parsers/estree.d.ts`
- These files are gitignored and generated by the Node build/test scripts through
  `tools/generate-proto.ts`.
- The compile flow then copies the generated runtime files into `lib/` for packaged execution.

### Test Runtime Mock Servers

- Reworked bridge test mock servers from HTTP to gRPC in:
  - `sonar-plugin/bridge/src/test/resources/mock-bridge/startServer.js`
  - `sonar-plugin/bridge/src/test/resources/mock-bridge/logging.js`
  - `sonar-plugin/bridge/src/test/resources/mock-bridge/startAndClose.js`
  - `sonar-plugin/bridge/src/test/resources/mock-bridge/badResponse.js`
  - `sonar-plugin/bridge/src/test/resources/mock-bridge/timeout.js`
- Added shared gRPC test helper:
  - `sonar-plugin/bridge/src/test/resources/mock-bridge/analyzeProjectGrpcServer.js`

### Post-migration Stability Fixes

- Bounded Java-side external process termination waits to seconds instead of minutes:
  - `NodeCommand.waitFor()` now uses a 5 second process wait cap.
  - `StreamConsumer.await()` now uses a 5 second executor shutdown cap.
- Added `NodeCommand.destroy()` so startup-failure cleanup can forcibly terminate the spawned runtime when needed.
- Updated `BridgeServerImplTest` to use realistic per-test timeouts for the heavier gRPC startup path while still keeping failures short.
- Fixed test resource path resolution so the bridge tests work both from the module directory and the repository root.
- Fixed analyze-project stream cleanup so post-completion client cancellation does not trigger
  unhandled asynchronous failures while the worker is already shutting down.

### Removed HTTP Runtime Stack

- Deleted `packages/http` runtime package.
- Removed config references to deleted package in:
  - `packages/tsconfig.app.json`
  - `knip.json`
- Removed Node dependencies tied to removed runtime transport:
  - `ws`
  - `@types/ws`
  - `http-status-codes`

## Backward Compatibility

- Runtime HTTP/WebSocket API compatibility intentionally dropped.
- Docker/A3S gRPC API (`LanguageAnalyzerService`) preserved unchanged.

## Validation

- Verified Node compile/proto generation succeeds.
- Verified bridge module Java compile succeeds.
- Verified direct analyze-project gRPC tests in both execution modes:
  - `packages/grpc/tests/analyze-project-server.test.ts`: 6 tests passing (`with worker` and `without worker`).
- Verified targeted Java tests:
  - `BridgeServerImplTest`: 35 tests passing.
- Verified full `sonar-plugin/bridge` Java test slice:
  - 157 tests passing, 0 failures, 0 errors, 0 skipped.
- Verified `npm pack --dry-run` no longer lists stale HTTP/WebSocket-era license files such as `http-status-codes-LICENSE.txt` and `ws-LICENSE.txt`.
