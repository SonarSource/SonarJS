# HTTP/WebSocket to gRPC Migration

## Executive Summary

This specification details the migration of inter-process communication between the Java SonarQube plugin (`sonar-plugin/bridge/`) and the Node.js bridge (`packages/bridge/`) from HTTP/WebSocket to gRPC. The migration will **reuse the existing gRPC server** at `packages/grpc/` and add a new `BridgeService` in a separate proto file.

## Business Context

### Current State

- The Java plugin communicates with the Node.js bridge via HTTP REST endpoints and WebSocket for streaming
- Express.js server handles HTTP requests
- WebSocket handles streaming results for project analysis
- Separate gRPC server exists for external A3S clients (language_analyzer.proto)

### Target State

- All Java plugin to Node.js bridge communication uses gRPC
- Single gRPC server handles both A3S clients and Java plugin communication
- HTTP/WebSocket code is completely removed
- SonarLint compatibility maintained (does not use these endpoints)

## Key Constraints

| Constraint                                     | Rationale                                       |
| ---------------------------------------------- | ----------------------------------------------- |
| `language_analyzer.proto` must NOT be modified | Used by external A3S clients                    |
| Create NEW `bridge.proto` file                 | Separate protocol for Java plugin communication |
| Reuse existing gRPC server at `packages/grpc/` | Avoid duplicate server infrastructure           |
| Clean cutover - no dual-protocol support       | Simplifies implementation and testing           |
| SonarLint does not use these endpoints         | Safe to remove HTTP entirely                    |

## Architecture

### Current Architecture

```
Java Plugin                    Node.js Bridge
+------------------+          +------------------+
| BridgeServerImpl |--HTTP--->| Express (router) | packages/bridge/
| JSWebSocketClient|--WS----->| WebSocket (/ws)  |
+------------------+          +------------------+

External Clients (A3S)         +------------------+
+------------------+          | gRPC Server      | packages/grpc/
| A3S Proxy        |--gRPC--->| - Analyze()      | (language_analyzer.proto)
+------------------+          +------------------+
```

### Target Architecture

```
Java Plugin                    Node.js Bridge
+------------------+          +-------------------------------+
| BridgeGrpcClient |--gRPC--->| gRPC Server (packages/grpc/)  |
| (auto-generated) |          |                               |
+------------------+          | BridgeService (bridge.proto)  |
                              | - InitLinter, AnalyzeJsTs...  |
External Clients (A3S)        |                               |
+------------------+          | LanguageAnalyzerService       |
| A3S Proxy        |--gRPC--->| - Analyze() (unchanged)       |
+------------------+          |                               |
                              | Health.Check() (shared)       |
                              +-------------------------------+
```

## Routes to Migrate

| Route                   | Purpose                   | gRPC Equivalent                            |
| ----------------------- | ------------------------- | ------------------------------------------ |
| `GET /status`           | Health check              | Already done (`grpc.health.v1.Health`)     |
| `POST /init-linter`     | Initialize ESLint rules   | Unary RPC: `InitLinter`                    |
| `POST /analyze-jsts`    | Analyze single JS/TS file | Unary RPC: `AnalyzeJsTs`                   |
| `POST /analyze-css`     | Analyze CSS file          | Unary RPC: `AnalyzeCss`                    |
| `POST /analyze-yaml`    | Analyze YAML file         | Unary RPC: `AnalyzeYaml`                   |
| `POST /analyze-html`    | Analyze HTML file         | Unary RPC: `AnalyzeHtml`                   |
| `POST /analyze-project` | Batch project analysis    | **Server streaming RPC**: `AnalyzeProject` |
| `POST /cancel-analysis` | Cancel ongoing analysis   | Unary RPC: `CancelAnalysis`                |
| `POST /close`           | Shutdown server           | Unary RPC: `Close`                         |
| `WS /ws`                | Streaming results         | Replaced by server streaming               |

## Phase Overview

| Phase                                       | Description                         | Duration     | Dependencies     |
| ------------------------------------------- | ----------------------------------- | ------------ | ---------------- |
| [Phase 1](phase-1-proto-definition.md)      | Protocol Buffer Definition          | 1.5 days     | None             |
| [Phase 2](phase-2-nodejs-implementation.md) | Node.js gRPC Service Implementation | 6.75 days    | Phase 1          |
| [Phase 3](phase-3-java-implementation.md)   | Java gRPC Client Implementation     | 6.5 days     | Phase 1          |
| [Phase 4](phase-4-cleanup.md)               | HTTP/WebSocket Removal              | 2 days       | Phase 2, Phase 3 |
| [Phase 5](phase-5-testing.md)               | Testing and Verification            | 6 days       | Phase 4          |
| **Total**                                   |                                     | **~23 days** |                  |

Note: Phase 2 and Phase 3 can be worked on in parallel after Phase 1 is complete.

## Success Criteria

1. **Functional Equivalence**: All existing functionality works identically via gRPC
2. **Unit Tests**: All unit tests pass (Node.js and Java)
3. **Integration Tests**: All integration tests pass (`its/` test suite)
4. **Ruling Tests**: Analysis results are identical before and after migration
5. **Code Cleanup**: No HTTP/WebSocket code remains in the codebase
6. **A3S Compatibility**: A3S clients continue to work (language_analyzer.proto unchanged)
7. **Performance**: Equivalent or better than HTTP/WebSocket

## Files Summary

### New Files (Node.js)

| File                                         | Purpose                       |
| -------------------------------------------- | ----------------------------- |
| `packages/grpc/src/proto/bridge.proto`       | Protocol buffer definition    |
| `packages/grpc/src/proto/bridge.d.ts`        | Generated TypeScript types    |
| `packages/grpc/src/proto/bridge.js`          | Generated JavaScript code     |
| `packages/grpc/src/bridge-service.ts`        | gRPC service handlers         |
| `packages/grpc/src/bridge-transformers/*.ts` | Request/response transformers |

### New Files (Java)

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `BridgeGrpcClient.java`           | gRPC client wrapper                          |
| `BridgeRequestConverter.java`     | Request conversion utilities                 |
| `BridgeResponseConverter.java`    | Response conversion utilities                |
| `GrpcProjectAnalysisHandler.java` | Streaming response handler                   |
| Generated gRPC classes            | Auto-generated in `target/generated-sources` |

### Modified Files

| File                                  | Changes                               |
| ------------------------------------- | ------------------------------------- |
| `packages/grpc/src/server.ts`         | Register BridgeService                |
| `packages/grpc/src/health-service.ts` | Include BridgeService in health check |
| `sonar-plugin/bridge/pom.xml`         | Add gRPC dependencies                 |
| `BridgeServerImpl.java`               | Use gRPC client instead of HTTP       |

### Deleted Files (Node.js)

- `packages/bridge/src/server.ts`
- `packages/bridge/src/router.ts`
- `packages/bridge/src/delegate.ts`
- `packages/bridge/src/errors/middleware.ts`
- `packages/bridge/src/timeout/middleware.ts`

### Deleted Files (Java)

- `Http.java`
- `JSWebSocketClient.java`
- `WebSocketMessageHandler.java`

## Risk Assessment

See [dependencies.md](dependencies.md) for detailed risk analysis.

| Risk Level | Risk                           | Mitigation                                               |
| ---------- | ------------------------------ | -------------------------------------------------------- |
| High       | Streaming behavior differences | Thorough testing of project analysis                     |
| High       | Message size limits            | Configure max gRPC message size (100MB)                  |
| Medium     | Build complexity               | Follow established patterns from existing protobuf usage |
| Medium     | Type conversion errors         | Comprehensive unit tests for converters                  |
| Low        | Performance differences        | Expected to be equivalent or better                      |
| Low        | Dependency conflicts           | Use shaded netty to avoid conflicts                      |

## Team and Responsibilities

- **Quality Web Squad**: Primary reviewers for all PRs
- Add `SonarSource/quality-web-squad` as reviewer on all pull requests

## Related Documentation

- [Phase 1: Proto Definition](phase-1-proto-definition.md)
- [Phase 2: Node.js Implementation](phase-2-nodejs-implementation.md)
- [Phase 3: Java Implementation](phase-3-java-implementation.md)
- [Phase 4: Cleanup](phase-4-cleanup.md)
- [Phase 5: Testing](phase-5-testing.md)
- [Technical Decisions](technical-decisions.md)
- [Dependencies and Risks](dependencies.md)
