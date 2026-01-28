# Dependencies and Risks

This document details external dependencies, library requirements, team coordination needs, and known risks for the gRPC migration project.

---

## External Dependencies

### Node.js Dependencies

| Package              | Version | Purpose                  | Notes                  |
| -------------------- | ------- | ------------------------ | ---------------------- |
| `@grpc/grpc-js`      | ^1.9.0  | gRPC runtime for Node.js | Already in use         |
| `protobufjs`         | ^7.0.0  | Protocol buffer runtime  | Already in use         |
| `@grpc/proto-loader` | ^0.7.0  | Dynamic proto loading    | May already be present |

**Already Used**: The `packages/grpc` package already uses these dependencies for the A3S integration.

### Java Dependencies

| Dependency                          | Version | Purpose                | Notes                     |
| ----------------------------------- | ------- | ---------------------- | ------------------------- |
| `io.grpc:grpc-netty-shaded`         | 1.60.0  | gRPC network transport | Shaded to avoid conflicts |
| `io.grpc:grpc-protobuf`             | 1.60.0  | Protobuf integration   | Core gRPC dependency      |
| `io.grpc:grpc-stub`                 | 1.60.0  | Generated stub base    | Core gRPC dependency      |
| `io.grpc:grpc-services`             | 1.60.0  | Health check service   | For standard health check |
| `io.grpc:grpc-testing`              | 1.60.0  | Testing utilities      | Test scope only           |
| `com.google.protobuf:protobuf-java` | 4.33.4  | Protobuf runtime       | Via grpc-protobuf         |
| `org.apache.tomcat:annotations-api` | 6.0.53  | @Generated annotation  | Provided scope            |

### Build Dependencies

| Dependency                                         | Version | Purpose                       | Notes           |
| -------------------------------------------------- | ------- | ----------------------------- | --------------- |
| `kr.motd.maven:os-maven-plugin`                    | 1.7.1   | OS detection for protoc       | Maven extension |
| `org.xolstice.maven.plugins:protobuf-maven-plugin` | 0.6.1   | Protobuf/gRPC code generation | Maven plugin    |
| `org.codehaus.mojo:build-helper-maven-plugin`      | 3.4.0   | Add generated sources         | Maven plugin    |

---

## Dependencies to Remove

### Node.js (after cleanup)

| Package          | Reason                       |
| ---------------- | ---------------------------- |
| `express`        | HTTP server no longer needed |
| `ws`             | WebSocket no longer needed   |
| `body-parser`    | Express middleware           |
| `@types/express` | Type definitions             |
| `@types/ws`      | Type definitions             |

### Java (after cleanup)

| Dependency                          | Reason                            |
| ----------------------------------- | --------------------------------- |
| `org.java-websocket:Java-WebSocket` | WebSocket client no longer needed |

---

## Team Coordination

### Required Reviews

| Team               | Scope         | Notes                   |
| ------------------ | ------------- | ----------------------- |
| Quality Web Squad  | All PRs       | Standard review process |
| DevOps (if needed) | Build changes | Maven plugin additions  |

### Communication Points

1. **Before Phase 1**: Announce migration plan to team
2. **After Phase 1**: Review proto definition with team
3. **Before Phase 4**: Coordinate cleanup timing
4. **After Phase 5**: Announce migration completion

### Parallel Work Considerations

- Phase 2 (Node.js) and Phase 3 (Java) can proceed in parallel
- Phase 4 (Cleanup) requires both Phase 2 and Phase 3 complete
- Phase 5 (Testing) should start after Phase 4

---

## Known Risks

### High Priority Risks

#### Risk: Streaming Behavior Differences

**Description**: gRPC server streaming may have different characteristics than WebSocket.

**Impact**: High - Could affect project analysis correctness

**Likelihood**: Medium

**Mitigation**:

- Thorough testing of project analysis
- Compare streaming behavior between HTTP/WS and gRPC
- Test with large projects (100+ files)
- Test cancellation scenarios

**Detection**: Ruling tests will detect any analysis differences

---

#### Risk: Message Size Limits

**Description**: Large files or analysis results may exceed gRPC message size limits.

**Impact**: High - Could fail on large files

**Likelihood**: Medium

**Mitigation**:

- Configure max message size to 100MB
- Test with largest known files in codebase
- Add monitoring for message sizes

**Detection**: Integration tests with large files

---

### Medium Priority Risks

#### Risk: Build Complexity

**Description**: Adding protobuf-maven-plugin increases build complexity.

**Impact**: Medium - Could slow builds or cause CI issues

**Likelihood**: Medium

**Mitigation**:

- Follow established patterns from existing protobuf usage in other Sonar projects
- Test build on all platforms (Linux, Windows, macOS)
- Document build requirements

**Detection**: CI builds on all platforms

---

#### Risk: Type Conversion Errors

**Description**: Complex nested structures in configurations may not convert correctly.

**Impact**: Medium - Could cause analysis issues

**Likelihood**: Medium

**Mitigation**:

- Comprehensive unit tests for converters
- Test with all rule configurations
- JSON configuration round-trip testing

**Detection**: Unit tests, ruling tests

---

#### Risk: Protobuf Version Conflicts

**Description**: Different versions of protobuf in dependencies could conflict.

**Impact**: Medium - Could cause runtime errors

**Likelihood**: Low

**Mitigation**:

- Use consistent protobuf version across all dependencies
- Check dependency tree for conflicts
- Use shaded netty to isolate gRPC dependencies

**Detection**: Maven dependency analysis, runtime testing

---

### Low Priority Risks

#### Risk: Performance Differences

**Description**: gRPC may have different performance characteristics than HTTP/WebSocket.

**Impact**: Low - Unlikely to be worse, may be better

**Likelihood**: Low

**Mitigation**:

- Benchmark before and after migration
- Profile if significant differences observed

**Detection**: Performance testing, ruling test timing

---

#### Risk: Dependency Conflicts in SonarQube

**Description**: gRPC dependencies may conflict with SonarQube runtime.

**Impact**: Medium - Could prevent plugin from loading

**Likelihood**: Low

**Mitigation**:

- Use shaded netty
- Test with multiple SonarQube versions
- Follow SonarQube plugin best practices

**Detection**: Integration tests with SonarQube

---

## Risk Mitigation Timeline

| Phase   | Risk Focus              | Key Mitigations                      |
| ------- | ----------------------- | ------------------------------------ |
| Phase 1 | Proto design            | Review proto against existing types  |
| Phase 2 | Streaming, transformers | Unit tests for handlers              |
| Phase 3 | Build, conversion       | Maven build testing, converter tests |
| Phase 4 | Clean removal           | Verify no broken references          |
| Phase 5 | All risks               | Comprehensive testing                |

---

## Blockers

### Known Blockers

None identified at this time.

### Potential Blockers

1. **CI Infrastructure**: If CI doesn't support protoc, may need to add it
2. **Maven Repository Access**: protobuf-maven-plugin downloads protoc
3. **Platform Support**: protoc binaries needed for all build platforms

---

## Dependency Verification Checklist

Before starting implementation:

- [ ] Verify `@grpc/grpc-js` is already in `packages/grpc`
- [ ] Verify protobufjs is already in `packages/grpc`
- [ ] Check current gRPC version compatibility
- [ ] Verify Maven can download grpc-java plugin
- [ ] Check CI has protoc or can download it
- [ ] Verify no Netty version in SonarQube conflicts

---

## Rollback Plan

If critical issues are discovered:

1. **Before Phase 4 (cleanup)**:
   - HTTP/WebSocket code still exists
   - Can revert gRPC changes and use HTTP

2. **After Phase 4 (cleanup)**:
   - Git revert cleanup commits
   - Re-add HTTP dependencies
   - Both protocols can coexist temporarily

3. **Recovery Time Estimate**: 2-4 hours
