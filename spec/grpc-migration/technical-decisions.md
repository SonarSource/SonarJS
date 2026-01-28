# Technical Decisions Record

This document captures the architectural and technical decisions made for the HTTP/WebSocket to gRPC migration project.

---

## ADR-001: Separate Proto File for Bridge Communication

### Status

Accepted

### Context

The existing gRPC infrastructure uses `language_analyzer.proto` for A3S client communication. We need to add gRPC support for Java plugin communication.

### Decision

Create a new `bridge.proto` file instead of modifying `language_analyzer.proto`.

### Rationale

- `language_analyzer.proto` is used by external A3S clients
- Modifying it could break backward compatibility
- Separate proto files allow independent evolution
- Clear separation of concerns between internal (Java plugin) and external (A3S) clients

### Consequences

- Two proto files to maintain
- Shared types may be duplicated (acceptable trade-off)
- Clear API boundaries

---

## ADR-002: Server Streaming for Project Analysis

### Status

Accepted

### Context

Project analysis currently uses WebSocket for streaming results back to the Java plugin. Need to choose gRPC streaming pattern.

### Decision

Use server streaming RPC (`returns (stream AnalyzeProjectResponse)`) for project analysis.

### Alternatives Considered

1. **Unary RPC**: Return all results at once
   - Rejected: Would require buffering all results, defeating purpose of streaming
2. **Bidirectional streaming**: Both client and server stream
   - Rejected: Client doesn't need to stream requests; adds complexity
3. **Server streaming** (chosen): Server streams results, client sends single request
   - Fits the use case perfectly

### Rationale

- Matches current WebSocket behavior (server pushes results)
- Client sends single request with file list
- Server streams results as files are analyzed
- Client can process results incrementally
- Supports cancellation via client disconnect

### Consequences

- Java client must handle streaming iterator
- Need to handle backpressure appropriately
- Cancellation requires special handling

---

## ADR-003: Use `oneof` for Streaming Response Types

### Status

Accepted

### Context

Project analysis streaming can send different types of messages: file results, meta information, cancellation, and errors.

### Decision

Use protobuf `oneof` to represent different response types in `AnalyzeProjectResponse`.

```protobuf
message AnalyzeProjectResponse {
  oneof result {
    FileAnalysisResult file_result = 1;
    ProjectMeta meta = 2;
    AnalysisCancelled cancelled = 3;
    AnalysisError error = 4;
  }
}
```

### Alternatives Considered

1. **Separate message with type enum + bytes payload**
   - Rejected: Requires manual deserialization, loses type safety
2. **Multiple streaming RPCs**
   - Rejected: Would require coordinating multiple streams
3. **oneof** (chosen)
   - Clean, type-safe representation of message variants

### Rationale

- Type-safe: Generated code provides accessor methods for each variant
- Self-documenting: Proto clearly shows possible message types
- Efficient: No overhead from unused fields

### Consequences

- Client must check which field is set
- Adding new message types requires proto change

---

## ADR-004: Use Shaded Netty for gRPC

### Status

Accepted

### Context

The Java plugin runs inside SonarQube, which may have its own Netty version. Need to avoid dependency conflicts.

### Decision

Use `grpc-netty-shaded` instead of `grpc-netty`.

```xml
<dependency>
  <groupId>io.grpc</groupId>
  <artifactId>grpc-netty-shaded</artifactId>
  <version>${grpc.version}</version>
</dependency>
```

### Rationale

- `grpc-netty-shaded` relocates Netty classes to `io.grpc.netty.shaded`
- Avoids classpath conflicts with SonarQube's Netty
- Industry best practice for embedding gRPC in larger applications

### Consequences

- Slightly larger JAR size
- Isolated from Netty version conflicts
- No additional configuration needed

---

## ADR-005: JSON Encoding for Rule Configurations

### Status

Accepted

### Context

ESLint rules have complex, varying configuration shapes. Need to represent these in protobuf.

### Decision

Encode rule configurations as JSON strings in the proto messages.

```protobuf
message EslintRule {
  string key = 1;
  repeated string configurations = 3;  // JSON-encoded configurations
}
```

### Alternatives Considered

1. **google.protobuf.Struct**
   - Rejected: Verbose, doesn't map cleanly to arbitrary JSON
2. **bytes field**
   - Rejected: Loses human readability for debugging
3. **JSON strings** (chosen)
   - Flexible, matches current HTTP implementation

### Rationale

- Rule configurations vary widely between rules
- JSON allows arbitrary structures
- Easy to serialize/deserialize on both sides
- Matches existing HTTP implementation

### Consequences

- Need JSON parser on both sides (already have Gson in Java, JSON.parse in JS)
- Type safety for configurations is handled by ESLint, not the transport layer

---

## ADR-006: Max Message Size Configuration

### Status

Accepted

### Context

Some analysis results can be large (AST, many issues). Default gRPC message size may be insufficient.

### Decision

Configure max message size to 100MB on both client and server.

```typescript
// Node.js server
const server = new grpc.Server({
  'grpc.max_receive_message_length': 100 * 1024 * 1024,
  'grpc.max_send_message_length': 100 * 1024 * 1024,
});
```

```java
// Java client
ManagedChannelBuilder.forAddress(host, port)
    .maxInboundMessageSize(100 * 1024 * 1024)
    .build();
```

### Rationale

- Analysis responses can contain serialized ASTs
- Projects with many issues can produce large responses
- 100MB is generous but prevents unbounded memory usage
- Matches typical file size limits in SonarQube

### Consequences

- Large messages are supported
- Memory usage is bounded
- May need adjustment if larger projects are encountered

---

## ADR-007: Clean Cutover (No Dual Protocol)

### Status

Accepted

### Context

Need to decide whether to support both HTTP and gRPC during migration.

### Decision

Implement clean cutover: remove HTTP completely when gRPC is implemented.

### Alternatives Considered

1. **Dual protocol support during transition**
   - Rejected: Adds complexity, doubles testing surface
2. **Feature flag to switch protocols**
   - Rejected: Complicates code, extends maintenance period
3. **Clean cutover** (chosen)
   - Simpler implementation, cleaner codebase

### Rationale

- SonarLint does not use these HTTP endpoints
- Java plugin and Node.js bridge are released together
- No external consumers of the HTTP API
- Simplifies testing and maintenance

### Consequences

- No fallback if gRPC has issues (mitigated by thorough testing)
- All-or-nothing switch
- Cleaner, more maintainable codebase

---

## ADR-008: Health Check Service Integration

### Status

Accepted

### Context

Need to verify the bridge server is ready before sending requests.

### Decision

Use standard gRPC health check protocol (`grpc.health.v1.Health`).

### Rationale

- Industry standard for gRPC health checks
- Already implemented for A3S clients
- Simple boolean status (SERVING/NOT_SERVING)
- Works with gRPC load balancers and tools

### Consequences

- Java client can use standard health check
- Easy to monitor with standard tools
- No custom health check protocol needed

---

## ADR-009: Blocking vs Async Client Stubs in Java

### Status

Accepted

### Context

gRPC Java generates both blocking and async stubs. Need to decide which to use.

### Decision

Use blocking stubs for most operations, but support async for future use.

```java
private final BridgeServiceGrpc.BridgeServiceBlockingStub blockingStub;

private final BridgeServiceGrpc.BridgeServiceStub asyncStub; // Available for future use
```

### Rationale

- Blocking stubs match current synchronous HTTP calls
- Simpler code flow, easier to debug
- Async stubs available if needed for performance optimization
- Project analysis already handles streaming correctly

### Consequences

- Simpler initial implementation
- Can optimize with async later if needed
- Thread model matches existing code

---

## ADR-010: Transformer Pattern for Type Conversion

### Status

Accepted

### Context

Need to convert between gRPC message types and internal domain types on both sides.

### Decision

Create dedicated transformer modules/classes for conversions.

```
// Node.js
packages/grpc/src/bridge-transformers/
  init-linter.ts
  analyze-jsts.ts
  analyze-css.ts
  ...

// Java
BridgeRequestConverter.java
BridgeResponseConverter.java
```

### Rationale

- Separates conversion logic from business logic
- Makes conversions testable in isolation
- Clear, discoverable location for conversion code
- Consistent pattern on both sides

### Consequences

- Additional files to maintain
- Clear separation of concerns
- Easy to test
- Easy to add new conversions
