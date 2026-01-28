# Phase 5: Testing and Verification

## Objective

Ensure the gRPC implementation works correctly, all existing tests pass, and analysis results are identical to the pre-migration baseline.

## Prerequisites

- Phase 4 completed (HTTP/WebSocket code removed)
- All code changes merged
- Build succeeds for both Node.js and Java

## Duration

**Estimated: 6 days**

---

## Tasks

### P5-T01: Update Node.js unit tests

**Description**: Update bridge unit tests to test gRPC handlers instead of HTTP routes.

**Estimated Effort**: 2 days

#### Technical Specification

##### Tests to Delete

Tests for deleted HTTP components:

| File                                               | Reason                      |
| -------------------------------------------------- | --------------------------- |
| `packages/bridge/tests/server.test.ts`             | Tests Express server        |
| `packages/bridge/tests/router.test.ts`             | Tests HTTP routes           |
| `packages/bridge/tests/delegate.test.ts`           | Tests HTTP delegation       |
| `packages/bridge/tests/errors/middleware.test.ts`  | Tests HTTP error middleware |
| `packages/bridge/tests/timeout/middleware.test.ts` | Tests timeout middleware    |

##### Tests to Create

Create tests for gRPC handlers in `packages/grpc/tests/`:

```typescript
// packages/grpc/tests/bridge-service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { createGrpcServer } from '../src/server.js';
import { bridge } from '../src/proto/bridge.js';

describe('BridgeService', () => {
  let server: grpc.Server;
  let client: BridgeServiceClient;

  beforeAll(async () => {
    server = createGrpcServer();
    await new Promise<void>((resolve, reject) => {
      server.bindAsync('localhost:0', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) reject(err);
        else {
          client = createClient(port);
          resolve();
        }
      });
    });
  });

  afterAll(() => {
    server.forceShutdown();
  });

  describe('InitLinter', () => {
    it('should initialize linter with rules', async () => {
      const response = await client.initLinter({
        rules: [
          {
            key: 'no-unused-vars',
            fileTypeTargets: ['MAIN'],
            configurations: ['{}'],
            analysisModes: ['DEFAULT'],
            blacklistedExtensions: [],
            language: 'js',
          },
        ],
        environments: [],
        globals: [],
        baseDir: '/test',
        sonarlint: false,
        bundles: [],
        rulesWorkdir: '/tmp',
      });

      expect(response.success).toBe(true);
    });

    it('should return error for invalid rule', async () => {
      const response = await client.initLinter({
        rules: [
          {
            key: 'invalid-rule-that-does-not-exist',
            fileTypeTargets: ['MAIN'],
            configurations: [],
            analysisModes: ['DEFAULT'],
            blacklistedExtensions: [],
            language: 'js',
          },
        ],
        environments: [],
        globals: [],
        baseDir: '/test',
        sonarlint: false,
        bundles: [],
        rulesWorkdir: '/tmp',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });
  });

  describe('AnalyzeJsTs', () => {
    it('should analyze JavaScript file', async () => {
      const response = await client.analyzeJsTs({
        filePath: '/test/example.js',
        fileType: 'MAIN',
        fileContent: 'const x = 1;',
        ignoreHeaderComments: false,
        tsConfigs: [],
        fileStatus: 'ADDED',
        analysisMode: 'DEFAULT',
        skipAst: true,
        shouldClearDependenciesCache: false,
        sonarlint: false,
        allowTsParserJsFiles: false,
      });

      expect(response.issues).toBeDefined();
      expect(Array.isArray(response.issues)).toBe(true);
    });

    it('should return parsing error for invalid syntax', async () => {
      const response = await client.analyzeJsTs({
        filePath: '/test/invalid.js',
        fileType: 'MAIN',
        fileContent: 'const x = {', // Invalid syntax
        ignoreHeaderComments: false,
        tsConfigs: [],
        fileStatus: 'ADDED',
        analysisMode: 'DEFAULT',
        skipAst: true,
        shouldClearDependenciesCache: false,
        sonarlint: false,
        allowTsParserJsFiles: false,
      });

      expect(response.parsingError).toBeDefined();
      expect(response.parsingError?.code).toBe('PARSING');
    });

    it('should analyze TypeScript file', async () => {
      const response = await client.analyzeJsTs({
        filePath: '/test/example.ts',
        fileType: 'MAIN',
        fileContent: 'const x: number = 1;',
        ignoreHeaderComments: false,
        tsConfigs: [],
        fileStatus: 'ADDED',
        analysisMode: 'DEFAULT',
        skipAst: true,
        shouldClearDependenciesCache: false,
        sonarlint: false,
        allowTsParserJsFiles: false,
      });

      expect(response.issues).toBeDefined();
    });
  });

  describe('AnalyzeCss', () => {
    it('should analyze CSS file', async () => {
      const response = await client.analyzeCss({
        filePath: '/test/style.css',
        fileContent: '.class { color: red; }',
        rules: [],
      });

      expect(response.issues).toBeDefined();
    });
  });

  describe('AnalyzeProject (streaming)', () => {
    it('should stream results for multiple files', async () => {
      const results: bridge.IAnalyzeProjectResponse[] = [];

      await new Promise<void>((resolve, reject) => {
        const stream = client.analyzeProject({
          files: {
            '/test/a.js': {
              filePath: '/test/a.js',
              fileType: 'MAIN',
              fileStatus: 'ADDED',
              fileContent: 'const a = 1;',
            },
            '/test/b.js': {
              filePath: '/test/b.js',
              fileType: 'MAIN',
              fileStatus: 'ADDED',
              fileContent: 'const b = 2;',
            },
          },
          rules: [],
          bundles: [],
          rulesWorkdir: '/tmp',
        });

        stream.on('data', response => results.push(response));
        stream.on('error', reject);
        stream.on('end', resolve);
      });

      // Should have file results and meta
      const fileResults = results.filter(r => r.fileResult);
      const metaResults = results.filter(r => r.meta);

      expect(fileResults.length).toBe(2);
      expect(metaResults.length).toBe(1);
    });
  });

  describe('CancelAnalysis', () => {
    it('should cancel ongoing analysis', async () => {
      const response = await client.cancelAnalysis({});
      expect(response.success).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should report BridgeService as SERVING', async () => {
      const response = await healthClient.check({
        service: 'bridge.BridgeService',
      });
      expect(response.status).toBe('SERVING');
    });
  });
});
```

##### Tests for Transformers

```typescript
// packages/grpc/tests/bridge-transformers/analyze-jsts.test.ts
import { describe, it, expect } from 'vitest';
import {
  transformAnalyzeJsTsRequest,
  transformAnalyzeJsTsResponse,
} from '../../src/bridge-transformers/analyze-jsts.js';

describe('analyze-jsts transformers', () => {
  describe('transformAnalyzeJsTsRequest', () => {
    it('should transform request with all fields', () => {
      const grpcRequest = {
        filePath: '/test/file.js',
        fileType: 'MAIN',
        fileContent: 'code',
        ignoreHeaderComments: true,
        tsConfigs: ['/tsconfig.json'],
        programId: 'prog1',
        fileStatus: 'CHANGED',
        analysisMode: 'SKIP_UNCHANGED',
        skipAst: true,
        shouldClearDependenciesCache: true,
        sonarlint: true,
        allowTsParserJsFiles: true,
      };

      const result = transformAnalyzeJsTsRequest(grpcRequest);

      expect(result.filePath).toBe('/test/file.js');
      expect(result.fileType).toBe('MAIN');
      expect(result.fileContent).toBe('code');
      expect(result.ignoreHeaderComments).toBe(true);
      expect(result.tsConfigs).toEqual(['/tsconfig.json']);
      expect(result.programId).toBe('prog1');
      expect(result.fileStatus).toBe('CHANGED');
      expect(result.analysisMode).toBe('SKIP_UNCHANGED');
      expect(result.skipAst).toBe(true);
      expect(result.shouldClearDependenciesCache).toBe(true);
      expect(result.sonarlint).toBe(true);
      expect(result.allowTsParserJsFiles).toBe(true);
    });

    it('should handle missing optional fields', () => {
      const grpcRequest = {
        filePath: '/test/file.js',
        fileType: 'MAIN',
      };

      const result = transformAnalyzeJsTsRequest(grpcRequest);

      expect(result.filePath).toBe('/test/file.js');
      expect(result.fileContent).toBeUndefined();
      expect(result.programId).toBeUndefined();
    });
  });

  describe('transformAnalyzeJsTsResponse', () => {
    it('should transform response with issues', () => {
      const analysisResult = {
        issues: [
          {
            line: 1,
            column: 0,
            endLine: 1,
            endColumn: 10,
            message: 'Error',
            ruleId: 'no-unused-vars',
            language: 'js',
            secondaryLocations: [],
            quickFixes: [],
            ruleEslintKeys: ['no-unused-vars'],
            filePath: '/test/file.js',
          },
        ],
        highlights: [],
        highlightedSymbols: [],
        metrics: null,
        cpdTokens: [],
      };

      const result = transformAnalyzeJsTsResponse(analysisResult);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].line).toBe(1);
      expect(result.issues[0].ruleId).toBe('no-unused-vars');
    });

    it('should transform response with parsing error', () => {
      const analysisResult = {
        parsingError: {
          message: 'Unexpected token',
          line: 5,
          code: 'PARSING',
        },
        issues: [],
        highlights: [],
        highlightedSymbols: [],
        metrics: null,
        cpdTokens: [],
      };

      const result = transformAnalyzeJsTsResponse(analysisResult);

      expect(result.parsingError).toBeDefined();
      expect(result.parsingError?.message).toBe('Unexpected token');
      expect(result.parsingError?.line).toBe(5);
      expect(result.parsingError?.code).toBe('PARSING');
    });
  });
});
```

#### Files Affected

| Action | File                                                |
| ------ | --------------------------------------------------- |
| DELETE | `packages/bridge/tests/server.test.ts`              |
| DELETE | `packages/bridge/tests/router.test.ts`              |
| DELETE | `packages/bridge/tests/delegate.test.ts`            |
| DELETE | HTTP middleware test files                          |
| CREATE | `packages/grpc/tests/bridge-service.test.ts`        |
| CREATE | `packages/grpc/tests/bridge-transformers/*.test.ts` |

#### Acceptance Criteria

- [ ] All HTTP-related tests deleted
- [ ] New tests cover all gRPC handlers
- [ ] New tests cover all transformer functions
- [ ] Test coverage for error cases
- [ ] Test coverage for streaming
- [ ] All tests pass

---

### P5-T02: Update Java unit tests

**Description**: Update BridgeServerImpl tests and create tests for the new gRPC client and converters.

**Estimated Effort**: 2 days

#### Technical Specification

##### Tests to Delete

| File                         | Reason                         |
| ---------------------------- | ------------------------------ |
| `HttpTest.java`              | Tests deleted Http class       |
| `JSWebSocketClientTest.java` | Tests deleted WebSocket client |

##### Tests to Create/Update

```java
// BridgeGrpcClientTest.java
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import io.grpc.ManagedChannel;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.stub.StreamObserver;
import io.grpc.testing.GrpcCleanupRule;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.plugins.javascript.bridge.grpc.*;

public class BridgeGrpcClientTest {

  @Rule
  public final GrpcCleanupRule grpcCleanup = new GrpcCleanupRule();

  @Test
  public void testIsAlive() throws Exception {
    // Create in-process server
    String serverName = InProcessServerBuilder.generateName();
    grpcCleanup.register(
      InProcessServerBuilder.forName(serverName)
        .directExecutor()
        .addService(new MockBridgeService())
        .addService(new MockHealthService())
        .build()
        .start()
    );

    // Create client
    ManagedChannel channel = grpcCleanup.register(
      InProcessChannelBuilder.forName(serverName).directExecutor().build()
    );

    BridgeGrpcClient client = new BridgeGrpcClient(channel);

    assertThat(client.isAlive()).isTrue();
  }

  @Test
  public void testAnalyzeJsTs() throws Exception {
    String serverName = InProcessServerBuilder.generateName();
    MockBridgeService mockService = new MockBridgeService();
    mockService.setAnalyzeJsTsResponse(
      AnalyzeJsTsResponse.newBuilder()
        .addIssues(
          Issue.newBuilder()
            .setLine(1)
            .setColumn(0)
            .setMessage("Test issue")
            .setRuleId("test-rule")
            .build()
        )
        .build()
    );

    grpcCleanup.register(
      InProcessServerBuilder.forName(serverName)
        .directExecutor()
        .addService(mockService)
        .build()
        .start()
    );

    ManagedChannel channel = grpcCleanup.register(
      InProcessChannelBuilder.forName(serverName).directExecutor().build()
    );

    BridgeGrpcClient client = new BridgeGrpcClient(channel);

    AnalyzeJsTsRequest request = AnalyzeJsTsRequest.newBuilder()
      .setFilePath("/test/file.js")
      .setFileType("MAIN")
      .setFileContent("const x = 1;")
      .build();

    AnalyzeJsTsResponse response = client.analyzeJsTs(request);

    assertThat(response.getIssuesCount()).isEqualTo(1);
    assertThat(response.getIssues(0).getRuleId()).isEqualTo("test-rule");
  }

  @Test
  public void testAnalyzeProjectStreaming() throws Exception {
    String serverName = InProcessServerBuilder.generateName();
    MockBridgeService mockService = new MockBridgeService();

    grpcCleanup.register(
      InProcessServerBuilder.forName(serverName)
        .directExecutor()
        .addService(mockService)
        .build()
        .start()
    );

    ManagedChannel channel = grpcCleanup.register(
      InProcessChannelBuilder.forName(serverName).directExecutor().build()
    );

    BridgeGrpcClient client = new BridgeGrpcClient(channel);

    List<AnalyzeProjectResponse> responses = new ArrayList<>();
    AnalyzeProjectRequest request = AnalyzeProjectRequest.newBuilder()
      .putFiles(
        "test.js",
        JsTsFile.newBuilder()
          .setFilePath("test.js")
          .setFileType("MAIN")
          .setFileStatus("ADDED")
          .build()
      )
      .build();

    client.analyzeProject(request, responses::add);

    assertThat(responses).isNotEmpty();
  }

  // Mock implementations for testing
  static class MockBridgeService extends BridgeServiceGrpc.BridgeServiceImplBase {

    private AnalyzeJsTsResponse analyzeJsTsResponse = AnalyzeJsTsResponse.getDefaultInstance();

    public void setAnalyzeJsTsResponse(AnalyzeJsTsResponse response) {
      this.analyzeJsTsResponse = response;
    }

    @Override
    public void initLinter(
      InitLinterRequest request,
      StreamObserver<InitLinterResponse> responseObserver
    ) {
      responseObserver.onNext(InitLinterResponse.newBuilder().setSuccess(true).build());
      responseObserver.onCompleted();
    }

    @Override
    public void analyzeJsTs(
      AnalyzeJsTsRequest request,
      StreamObserver<AnalyzeJsTsResponse> responseObserver
    ) {
      responseObserver.onNext(analyzeJsTsResponse);
      responseObserver.onCompleted();
    }

    @Override
    public void analyzeProject(
      AnalyzeProjectRequest request,
      StreamObserver<AnalyzeProjectResponse> responseObserver
    ) {
      // Send file results
      for (String filename : request.getFilesMap().keySet()) {
        responseObserver.onNext(
          AnalyzeProjectResponse.newBuilder()
            .setFileResult(
              FileAnalysisResult.newBuilder()
                .setFilename(filename)
                .setAnalysis(AnalyzeJsTsResponse.getDefaultInstance())
                .build()
            )
            .build()
        );
      }
      // Send meta
      responseObserver.onNext(
        AnalyzeProjectResponse.newBuilder().setMeta(ProjectMeta.getDefaultInstance()).build()
      );
      responseObserver.onCompleted();
    }

    @Override
    public void cancelAnalysis(
      CancelAnalysisRequest request,
      StreamObserver<CancelAnalysisResponse> responseObserver
    ) {
      responseObserver.onNext(CancelAnalysisResponse.newBuilder().setSuccess(true).build());
      responseObserver.onCompleted();
    }

    @Override
    public void close(CloseRequest request, StreamObserver<CloseResponse> responseObserver) {
      responseObserver.onNext(CloseResponse.newBuilder().setSuccess(true).build());
      responseObserver.onCompleted();
    }
  }
}
```

```java
// BridgeRequestConverterTest.java
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.Test;
import org.sonar.plugins.javascript.bridge.grpc.*;

public class BridgeRequestConverterTest {

  @Test
  public void testToInitLinterRequest() {
    List<EslintRule> rules = List.of(
      new EslintRule(
        "no-unused-vars",
        List.of("MAIN"),
        List.of(),
        List.of("DEFAULT"),
        List.of(),
        "js"
      )
    );

    InitLinterRequest result = BridgeRequestConverter.toInitLinterRequest(
      rules,
      List.of("browser"),
      List.of("jQuery"),
      "/base",
      false,
      List.of(),
      "/workdir"
    );

    assertThat(result.getRulesCount()).isEqualTo(1);
    assertThat(result.getRules(0).getKey()).isEqualTo("no-unused-vars");
    assertThat(result.getEnvironmentsList()).containsExactly("browser");
    assertThat(result.getGlobalsList()).containsExactly("jQuery");
    assertThat(result.getBaseDir()).isEqualTo("/base");
  }

  @Test
  public void testToAnalyzeJsTsRequest() {
    BridgeServer.JsAnalysisRequest request = new BridgeServer.JsAnalysisRequest(
      "/test/file.js",
      "MAIN",
      "const x = 1;",
      false,
      List.of(),
      null,
      "ADDED",
      "DEFAULT",
      false,
      false,
      false,
      false,
      null
    );

    AnalyzeJsTsRequest result = BridgeRequestConverter.toAnalyzeJsTsRequest(request);

    assertThat(result.getFilePath()).isEqualTo("/test/file.js");
    assertThat(result.getFileType()).isEqualTo("MAIN");
    assertThat(result.getFileContent()).isEqualTo("const x = 1;");
  }
}
```

```java
// BridgeResponseConverterTest.java
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.Test;
import org.sonar.plugins.javascript.bridge.grpc.*;

public class BridgeResponseConverterTest {

  @Test
  public void testFromAnalyzeJsTsResponse() {
    AnalyzeJsTsResponse response = AnalyzeJsTsResponse.newBuilder()
      .addIssues(
        Issue.newBuilder()
          .setLine(10)
          .setColumn(5)
          .setEndLine(10)
          .setEndColumn(15)
          .setMessage("Test message")
          .setRuleId("test-rule")
          .setLanguage("js")
          .build()
      )
      .setMetrics(
        Metrics.newBuilder().addNcloc(1).addNcloc(2).setFunctions(3).setStatements(10).build()
      )
      .build();

    BridgeServer.AnalysisResponse result = BridgeResponseConverter.fromAnalyzeJsTsResponse(
      response,
      "/test/file.js"
    );

    assertThat(result.issues()).hasSize(1);
    assertThat(result.issues().get(0).line()).isEqualTo(10);
    assertThat(result.issues().get(0).ruleId()).isEqualTo("test-rule");
    assertThat(result.metrics()).isNotNull();
    assertThat(result.metrics().ncloc()).containsExactly(1, 2);
  }

  @Test
  public void testFromAnalyzeJsTsResponseWithParsingError() {
    AnalyzeJsTsResponse response = AnalyzeJsTsResponse.newBuilder()
      .setParsingError(
        ParsingError.newBuilder()
          .setMessage("Unexpected token")
          .setLine(5)
          .setCode("PARSING")
          .build()
      )
      .build();

    BridgeServer.AnalysisResponse result = BridgeResponseConverter.fromAnalyzeJsTsResponse(
      response,
      "/test/file.js"
    );

    assertThat(result.parsingError()).isNotNull();
    assertThat(result.parsingError().message()).isEqualTo("Unexpected token");
    assertThat(result.parsingError().line()).isEqualTo(5);
  }

  @Test
  public void testFromAnalyzeProjectResponse_FileResult() {
    AnalyzeProjectResponse response = AnalyzeProjectResponse.newBuilder()
      .setFileResult(
        FileAnalysisResult.newBuilder()
          .setFilename("test.js")
          .setAnalysis(AnalyzeJsTsResponse.getDefaultInstance())
          .build()
      )
      .build();

    Object result = BridgeResponseConverter.fromAnalyzeProjectResponse(response);

    assertThat(result).isInstanceOf(BridgeResponseConverter.FileAnalysisResultWrapper.class);
    BridgeResponseConverter.FileAnalysisResultWrapper wrapper =
      (BridgeResponseConverter.FileAnalysisResultWrapper) result;
    assertThat(wrapper.filename()).isEqualTo("test.js");
  }
}
```

#### Files Affected

| Action | File                                                                        |
| ------ | --------------------------------------------------------------------------- |
| DELETE | `sonar-plugin/bridge/src/test/java/.../HttpTest.java`                       |
| DELETE | `sonar-plugin/bridge/src/test/java/.../JSWebSocketClientTest.java`          |
| CREATE | `sonar-plugin/bridge/src/test/java/.../BridgeGrpcClientTest.java`           |
| CREATE | `sonar-plugin/bridge/src/test/java/.../BridgeRequestConverterTest.java`     |
| CREATE | `sonar-plugin/bridge/src/test/java/.../BridgeResponseConverterTest.java`    |
| CREATE | `sonar-plugin/bridge/src/test/java/.../GrpcProjectAnalysisHandlerTest.java` |
| MODIFY | `sonar-plugin/bridge/src/test/java/.../BridgeServerImplTest.java`           |

#### Additional Dependencies for Testing

Add to `pom.xml`:

```xml
<dependency>
  <groupId>io.grpc</groupId>
  <artifactId>grpc-testing</artifactId>
  <version>${grpc.version}</version>
  <scope>test</scope>
</dependency>
```

#### Acceptance Criteria

- [ ] All HTTP/WebSocket-related tests deleted
- [ ] Tests for BridgeGrpcClient cover all methods
- [ ] Tests for converters cover all conversion methods
- [ ] Tests for GrpcProjectAnalysisHandler cover streaming
- [ ] BridgeServerImplTest updated to mock gRPC client
- [ ] All tests pass

---

### P5-T03: Run integration tests

**Description**: Run the full integration test suite (`its/`) to verify end-to-end functionality.

**Estimated Effort**: 1 day

#### Technical Specification

##### Commands

```bash
# Run integration tests
cd its
mvn verify -DskipTests=false
```

##### Expected Behavior

All integration tests should pass, verifying:

- Plugin can start Node.js bridge
- gRPC connection is established
- File analysis works correctly
- Project analysis works correctly
- Results are saved to SonarQube

##### Troubleshooting

If tests fail:

1. Check if Node.js bridge starts correctly (look for gRPC port binding)
2. Check Java client can connect (health check)
3. Check for timeout issues (may need to increase timeouts)
4. Compare stack traces to identify gRPC vs. logic issues

#### Acceptance Criteria

- [ ] All integration tests pass
- [ ] No new test failures introduced
- [ ] Test execution time is comparable to pre-migration

---

### P5-T04: Run ruling tests

**Description**: Run ruling tests to compare analysis results before and after migration, ensuring identical output.

**Estimated Effort**: 1 day

#### Technical Specification

##### Commands

```bash
# Run ruling tests
npm run ruling
```

##### Process

1. **Baseline** (done before migration): Ruling tests create expected results
2. **Verification** (after migration): Ruling tests compare current results to expected

If differences are found:

- Review each difference carefully
- Determine if difference is:
  - Bug in gRPC implementation (fix it)
  - Improvement (update expected results)
  - Timing/order difference (may be acceptable)

##### Expected Outcome

All ruling tests should produce identical results. Any difference indicates:

- Data transformation issue in converters
- Missing field in proto definition
- Logic difference in handlers

#### Acceptance Criteria

- [ ] Ruling tests produce identical results to baseline
- [ ] Any differences explained and either fixed or documented
- [ ] No regression in analysis accuracy

---

## Deliverables

1. Updated/new Node.js unit tests in `packages/grpc/tests/`
2. Updated/new Java unit tests in `sonar-plugin/bridge/src/test/`
3. Integration test results (all passing)
4. Ruling test results (identical to baseline)

## Exit Criteria

- [ ] All Node.js unit tests pass
- [ ] All Java unit tests pass
- [ ] All integration tests pass
- [ ] Ruling tests produce identical results
- [ ] Test coverage maintained or improved
- [ ] No performance regressions observed

## Test Coverage Requirements

### Node.js

| Component                  | Minimum Coverage |
| -------------------------- | ---------------- |
| `bridge-service.ts`        | 80%              |
| `bridge-transformers/*.ts` | 90%              |

### Java

| Component                         | Minimum Coverage |
| --------------------------------- | ---------------- |
| `BridgeGrpcClient.java`           | 80%              |
| `BridgeRequestConverter.java`     | 90%              |
| `BridgeResponseConverter.java`    | 90%              |
| `GrpcProjectAnalysisHandler.java` | 80%              |

## Performance Verification

Compare metrics before and after migration:

| Metric                       | Target            |
| ---------------------------- | ----------------- |
| Single file analysis latency | <= baseline       |
| Project analysis throughput  | >= baseline       |
| Memory usage                 | <= baseline + 10% |
| Startup time                 | <= baseline + 2s  |

## Risks and Mitigations

| Risk                       | Impact | Likelihood | Mitigation                            |
| -------------------------- | ------ | ---------- | ------------------------------------- |
| Ruling test differences    | High   | Medium     | Detailed review of each difference    |
| Integration test flakiness | Medium | Medium     | Add retries, increase timeouts        |
| Performance regression     | Medium | Low        | Profile and optimize if needed        |
| Test infrastructure issues | Low    | Low        | Use established gRPC testing patterns |
