# Phase 4: Cleanup and HTTP Removal

## Objective

Remove HTTP/WebSocket code and dependencies from both Node.js and Java codebases after the gRPC implementation is verified working.

## Prerequisites

- Phase 2 completed (Node.js gRPC implementation working)
- Phase 3 completed (Java gRPC client working)
- gRPC implementation tested and verified (basic smoke tests)

## Duration

**Estimated: 2 days**

---

## Tasks

### P4-T01: Remove Express.js server from Node.js bridge

**Description**: Remove HTTP server, WebSocket handling, and related middleware from the bridge package.

**Estimated Effort**: 1 day

#### Technical Specification

##### Files to Delete

| File                                        | Purpose (to be removed)             |
| ------------------------------------------- | ----------------------------------- |
| `packages/bridge/src/server.ts`             | Express.js HTTP server setup        |
| `packages/bridge/src/router.ts`             | HTTP route definitions              |
| `packages/bridge/src/delegate.ts`           | Request delegation to worker thread |
| `packages/bridge/src/errors/middleware.ts`  | Express error handling middleware   |
| `packages/bridge/src/timeout/middleware.ts` | Request timeout middleware          |

##### Files to Modify

**Entry Point / Startup Script**

Update the main entry point to start only the gRPC server:

```typescript
// packages/bridge/src/index.ts (or main entry point)
import { createGrpcServer, startGrpcServer } from '../grpc/src/server.js';

async function main() {
  const port = parseInt(process.env.GRPC_PORT || '50051', 10);

  const server = createGrpcServer();
  await startGrpcServer(server, port);

  console.log(`Bridge gRPC server started on port ${port}`);

  // Handle shutdown signals
  process.on('SIGTERM', () => {
    server.tryShutdown(() => {
      console.log('Server shut down');
      process.exit(0);
    });
  });
}

main().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

**Package Dependencies**

Remove from `packages/bridge/package.json`:

```json
{
  "dependencies": {
    // REMOVE these:
    "express": "...",
    "ws": "...",
    "body-parser": "..."
    // Any other HTTP-related dependencies
  },
  "devDependencies": {
    // REMOVE these:
    "@types/express": "...",
    "@types/ws": "..."
    // Any other HTTP-related type definitions
  }
}
```

**handle-request.ts**

Evaluate if `packages/bridge/src/handle-request.ts` is still needed:

- If it contains logic shared by gRPC handlers, keep it
- If it was only used by HTTP routes, delete it
- If partially used, refactor to remove HTTP-specific code

#### Files Affected

| Action   | File                                                |
| -------- | --------------------------------------------------- |
| DELETE   | `packages/bridge/src/server.ts`                     |
| DELETE   | `packages/bridge/src/router.ts`                     |
| DELETE   | `packages/bridge/src/delegate.ts`                   |
| DELETE   | `packages/bridge/src/errors/middleware.ts`          |
| DELETE   | `packages/bridge/src/timeout/middleware.ts`         |
| DELETE   | `packages/bridge/src/errors/` (directory if empty)  |
| DELETE   | `packages/bridge/src/timeout/` (directory if empty) |
| MODIFY   | `packages/bridge/package.json`                      |
| MODIFY   | Entry point / startup script                        |
| EVALUATE | `packages/bridge/src/handle-request.ts`             |

#### Verification Steps

1. Run `npm install` to update `node_modules` with removed dependencies
2. Run TypeScript compilation to verify no broken imports
3. Start the gRPC server and verify it accepts connections
4. Run health check to verify server is operational

#### Acceptance Criteria

- [ ] All HTTP server files deleted
- [ ] No Express.js dependencies in `package.json`
- [ ] No `ws` (WebSocket) dependencies in `package.json`
- [ ] Entry point starts gRPC server only
- [ ] TypeScript compiles without errors
- [ ] gRPC server starts and responds to health checks
- [ ] No broken imports referencing deleted files

---

### P4-T02: Remove HTTP/WebSocket client from Java plugin

**Description**: Remove HTTP client and WebSocket client code from the Java plugin.

**Estimated Effort**: 0.5 days

#### Technical Specification

##### Files to Delete

| File                                                                                                 | Purpose (to be removed)             |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/Http.java`                    | JDK HttpClient wrapper              |
| `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/JSWebSocketClient.java`       | WebSocket client                    |
| `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/WebSocketMessageHandler.java` | WebSocket message handler interface |

##### Dependencies to Remove

Update `sonar-plugin/bridge/pom.xml` to remove:

```xml
<dependencies>
  <!-- REMOVE this dependency -->
  <dependency>
    <groupId>org.java-websocket</groupId>
    <artifactId>Java-WebSocket</artifactId>
    <version>...</version>
  </dependency>
</dependencies>
```

Note: The JDK HttpClient does not require external dependencies, but verify there are no other HTTP-related dependencies to remove.

##### Test Files to Delete/Update

| Action | File                                                                                               | Reason                     |
| ------ | -------------------------------------------------------------------------------------------------- | -------------------------- |
| DELETE | `sonar-plugin/bridge/src/test/java/org/sonar/plugins/javascript/bridge/HttpTest.java`              | Tests deleted class        |
| DELETE | `sonar-plugin/bridge/src/test/java/org/sonar/plugins/javascript/bridge/JSWebSocketClientTest.java` | Tests deleted class        |
| UPDATE | `sonar-plugin/bridge/src/test/java/org/sonar/plugins/javascript/bridge/BridgeServerImplTest.java`  | Update to mock gRPC client |

#### Files Affected

| Action | File                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------- |
| DELETE | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/Http.java`                    |
| DELETE | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/JSWebSocketClient.java`       |
| DELETE | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/WebSocketMessageHandler.java` |
| MODIFY | `sonar-plugin/bridge/pom.xml`                                                                        |
| DELETE | Test files for deleted classes                                                                       |
| MODIFY | Test files that mock HTTP/WebSocket                                                                  |

#### Verification Steps

1. Run `mvn compile` to verify no broken imports
2. Run `mvn test` to verify all tests pass
3. Check for any remaining references to deleted classes using IDE search

#### Acceptance Criteria

- [ ] All HTTP client files deleted
- [ ] All WebSocket client files deleted
- [ ] WebSocket dependency removed from `pom.xml`
- [ ] Maven build compiles successfully
- [ ] All tests pass
- [ ] No remaining references to deleted classes

---

### P4-T03: Update startup scripts and configuration

**Description**: Update Node.js startup arguments and configuration to use gRPC port instead of HTTP port.

**Estimated Effort**: 0.5 days

#### Technical Specification

##### Node.js Startup Arguments

Update how the bridge is started to pass gRPC port:

```bash
# Before (HTTP)
node bridge.js --port 8080

# After (gRPC)
node bridge.js --grpc-port 50051
```

Or via environment variable:

```bash
GRPC_PORT=50051 node bridge.js
```

##### Java Configuration

Update `BridgeServerImpl` or related configuration to:

1. Use gRPC port naming instead of HTTP port
2. Update any property names that referenced HTTP

```java
// Before
private static final String PORT_PROPERTY = "sonar.javascript.bridge.port";

// After
private static final String GRPC_PORT_PROPERTY = "sonar.javascript.bridge.grpc.port";
```

Note: If backward compatibility is needed, support both property names temporarily.

##### Files to Modify

| File                                    | Changes                       |
| --------------------------------------- | ----------------------------- |
| Node.js entry point                     | Accept `--grpc-port` argument |
| `BridgeServerImpl.java`                 | Update port property handling |
| `BridgeServerConfig.java` (if exists)   | Update configuration class    |
| Any documentation referencing HTTP port | Update to gRPC port           |

#### Files Affected

| Action | File                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| MODIFY | Node.js entry point / startup script                                                          |
| MODIFY | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeServerImpl.java` |
| MODIFY | Configuration classes (if any)                                                                |

#### Acceptance Criteria

- [ ] gRPC port can be configured via argument or environment variable
- [ ] Property names updated to reflect gRPC (not HTTP)
- [ ] Default port documented
- [ ] Backward compatibility considered (if needed)

---

## Deliverables

1. Deleted HTTP/WebSocket Node.js files
2. Deleted HTTP/WebSocket Java files
3. Updated `package.json` without HTTP dependencies
4. Updated `pom.xml` without WebSocket dependency
5. Updated startup scripts and configuration

## Exit Criteria

- [ ] No HTTP server code remains in Node.js bridge
- [ ] No HTTP/WebSocket client code remains in Java plugin
- [ ] No Express.js, ws, or Java-WebSocket dependencies
- [ ] Both Node.js and Java compile successfully
- [ ] All tests pass
- [ ] gRPC communication works end-to-end

## Dependencies

- Phase 2 and Phase 3 must be complete
- gRPC implementation must be verified working before cleanup

## Verification Checklist

Before completing this phase, verify:

1. **Build Verification**
   - [ ] `npm install` succeeds in packages/bridge
   - [ ] `npm run build` succeeds for all packages
   - [ ] `mvn compile` succeeds for Java plugin
   - [ ] `mvn test` succeeds for Java plugin

2. **No Orphaned Code**
   - [ ] Search codebase for "express" - no production code references
   - [ ] Search codebase for "WebSocket" - no production code references
   - [ ] Search for imports of deleted files - none found

3. **Functional Verification**
   - [ ] Node.js gRPC server starts
   - [ ] Java plugin can connect via gRPC
   - [ ] Health check works
   - [ ] Single file analysis works
   - [ ] Project analysis streaming works

## Risks and Mitigations

| Risk                                | Impact | Likelihood | Mitigation                            |
| ----------------------------------- | ------ | ---------- | ------------------------------------- |
| Missing a reference to deleted code | Medium | Medium     | Use IDE "Find Usages" before deletion |
| Tests depending on HTTP mocks       | Low    | High       | Update tests to use gRPC mocks        |
| Configuration regression            | Medium | Low        | Document all configuration changes    |

## Rollback Plan

If issues are discovered after cleanup:

1. Git revert the cleanup commits
2. Re-add HTTP dependencies via `npm install`/`mvn install`
3. Both HTTP and gRPC can coexist temporarily for debugging
4. Once fixed, re-apply cleanup
