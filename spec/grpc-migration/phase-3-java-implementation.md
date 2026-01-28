# Phase 3: Java gRPC Client Implementation

## Objective

Replace HTTP client and WebSocket client with gRPC client stubs in the Java plugin, enabling type-safe communication with the Node.js bridge.

## Prerequisites

- Phase 1 completed (proto file exists)
- Maven build environment set up
- Understanding of existing BridgeServerImpl interface

## Duration

**Estimated: 6.5 days**

---

## Tasks

### P3-T01: Add gRPC dependencies to pom.xml

**Description**: Add gRPC Java dependencies and configure protobuf-maven-plugin for generating Java classes from `bridge.proto`.

**File**: `sonar-plugin/bridge/pom.xml`

**Estimated Effort**: 0.5 days

#### Technical Specification

Add the following to `sonar-plugin/bridge/pom.xml`:

```xml
<properties>
  <!-- Add these properties (check existing properties section) -->
  <grpc.version>1.60.0</grpc.version>
  <protobuf.version>4.33.4</protobuf.version>
</properties>

<dependencies>
  <!-- Existing dependencies... -->

  <!-- gRPC dependencies -->
  <dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-netty-shaded</artifactId>
    <version>${grpc.version}</version>
  </dependency>
  <dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-protobuf</artifactId>
    <version>${grpc.version}</version>
  </dependency>
  <dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-stub</artifactId>
    <version>${grpc.version}</version>
  </dependency>
  <dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-services</artifactId>
    <version>${grpc.version}</version>
  </dependency>

  <!-- Required for javax.annotation.Generated annotation -->
  <dependency>
    <groupId>org.apache.tomcat</groupId>
    <artifactId>annotations-api</artifactId>
    <version>6.0.53</version>
    <scope>provided</scope>
  </dependency>
</dependencies>

<build>
  <extensions>
    <!-- Required for detecting OS for protoc artifact -->
    <extension>
      <groupId>kr.motd.maven</groupId>
      <artifactId>os-maven-plugin</artifactId>
      <version>1.7.1</version>
    </extension>
  </extensions>

  <plugins>
    <!-- Existing plugins... -->

    <!-- Protobuf/gRPC code generation -->
    <plugin>
      <groupId>org.xolstice.maven.plugins</groupId>
      <artifactId>protobuf-maven-plugin</artifactId>
      <version>0.6.1</version>
      <configuration>
        <protocArtifact>com.google.protobuf:protoc:${protobuf.version}:exe:${os.detected.classifier}</protocArtifact>
        <pluginId>grpc-java</pluginId>
        <pluginArtifact>io.grpc:protoc-gen-grpc-java:${grpc.version}:exe:${os.detected.classifier}</pluginArtifact>
      </configuration>
      <executions>
        <execution>
          <id>generate-grpc-java-sources</id>
          <goals>
            <goal>compile</goal>
            <goal>compile-custom</goal>
          </goals>
          <phase>generate-sources</phase>
          <configuration>
            <protoSourceRoot>${project.basedir}/../../packages/grpc/src/proto</protoSourceRoot>
            <includes>
              <include>bridge.proto</include>
              <include>health.proto</include>
            </includes>
            <outputDirectory>${project.build.directory}/generated-sources/protobuf/java</outputDirectory>
            <clearOutputDirectory>false</clearOutputDirectory>
          </configuration>
        </execution>
      </executions>
    </plugin>

    <!-- Add generated sources to compilation -->
    <plugin>
      <groupId>org.codehaus.mojo</groupId>
      <artifactId>build-helper-maven-plugin</artifactId>
      <version>3.4.0</version>
      <executions>
        <execution>
          <id>add-grpc-sources</id>
          <phase>generate-sources</phase>
          <goals>
            <goal>add-source</goal>
          </goals>
          <configuration>
            <sources>
              <source>${project.build.directory}/generated-sources/protobuf/java</source>
              <source>${project.build.directory}/generated-sources/protobuf/grpc-java</source>
            </sources>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

#### Files Affected

| Action | File                          |
| ------ | ----------------------------- |
| MODIFY | `sonar-plugin/bridge/pom.xml` |

#### Acceptance Criteria

- [ ] `mvn compile` generates Java classes from `bridge.proto`
- [ ] Generated classes are in `org.sonar.plugins.javascript.bridge.grpc` package
- [ ] gRPC stubs are generated (`BridgeServiceGrpc.java`)
- [ ] Build compiles successfully without dependency conflicts
- [ ] `grpc-netty-shaded` avoids netty version conflicts

---

### P3-T02: Create BridgeGrpcClient class

**Description**: Create a new gRPC client class that wraps the generated stubs and provides a clean API for the bridge communication.

**File**: `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeGrpcClient.java`

**Estimated Effort**: 1 day

#### Technical Specification

```java
package org.sonar.plugins.javascript.bridge;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import io.grpc.health.v1.HealthCheckRequest;
import io.grpc.health.v1.HealthCheckResponse;
import io.grpc.health.v1.HealthGrpc;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.bridge.grpc.*;

/**
 * gRPC client for communication with the Node.js bridge.
 * Replaces HTTP and WebSocket clients.
 */
public class BridgeGrpcClient implements AutoCloseable {

  private static final Logger LOG = LoggerFactory.getLogger(BridgeGrpcClient.class);
  private static final int MAX_MESSAGE_SIZE = 100 * 1024 * 1024; // 100MB
  private static final int SHUTDOWN_TIMEOUT_SECONDS = 5;

  private final ManagedChannel channel;
  private final BridgeServiceGrpc.BridgeServiceBlockingStub blockingStub;
  private final BridgeServiceGrpc.BridgeServiceStub asyncStub;
  private final HealthGrpc.HealthBlockingStub healthStub;

  /**
   * Creates a new gRPC client connected to the specified host and port.
   *
   * @param host the host to connect to (usually "localhost")
   * @param port the gRPC port
   */
  public BridgeGrpcClient(String host, int port) {
    LOG.debug("Creating gRPC client for {}:{}", host, port);

    this.channel = ManagedChannelBuilder.forAddress(host, port)
      .usePlaintext()
      .maxInboundMessageSize(MAX_MESSAGE_SIZE)
      .build();

    this.blockingStub = BridgeServiceGrpc.newBlockingStub(channel);
    this.asyncStub = BridgeServiceGrpc.newStub(channel);
    this.healthStub = HealthGrpc.newBlockingStub(channel);
  }

  /**
   * Checks if the bridge server is alive and serving.
   *
   * @return true if the server is healthy, false otherwise
   */
  public boolean isAlive() {
    try {
      HealthCheckResponse response = healthStub.check(
        HealthCheckRequest.newBuilder().setService("bridge.BridgeService").build()
      );
      return response.getStatus() == HealthCheckResponse.ServingStatus.SERVING;
    } catch (StatusRuntimeException e) {
      LOG.debug("Health check failed: {}", e.getMessage());
      return false;
    }
  }

  /**
   * Waits for the server to become ready.
   *
   * @param timeoutMs timeout in milliseconds
   * @return true if server became ready within timeout, false otherwise
   */
  public boolean waitForReady(long timeoutMs) {
    long startTime = System.currentTimeMillis();
    while (System.currentTimeMillis() - startTime < timeoutMs) {
      if (isAlive()) {
        return true;
      }
      try {
        Thread.sleep(100);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return false;
      }
    }
    return false;
  }

  /**
   * Initializes the linter with the specified rules and configuration.
   *
   * @param request the initialization request
   * @throws IllegalStateException if initialization fails
   */
  public void initLinter(InitLinterRequest request) {
    LOG.debug("Initializing linter with {} rules", request.getRulesCount());

    InitLinterResponse response = blockingStub.initLinter(request);
    if (!response.getSuccess()) {
      throw new IllegalStateException("Failed to initialize linter: " + response.getError());
    }
  }

  /**
   * Analyzes a JavaScript or TypeScript file.
   *
   * @param request the analysis request
   * @return the analysis response
   */
  public AnalyzeJsTsResponse analyzeJsTs(AnalyzeJsTsRequest request) {
    LOG.debug("Analyzing JS/TS file: {}", request.getFilePath());
    return blockingStub.analyzeJsTs(request);
  }

  /**
   * Analyzes a CSS file.
   *
   * @param request the analysis request
   * @return the analysis response
   */
  public AnalyzeCssResponse analyzeCss(AnalyzeCssRequest request) {
    LOG.debug("Analyzing CSS file: {}", request.getFilePath());
    return blockingStub.analyzeCss(request);
  }

  /**
   * Analyzes a YAML file containing embedded JavaScript.
   *
   * @param request the analysis request
   * @return the analysis response
   */
  public AnalyzeYamlResponse analyzeYaml(AnalyzeYamlRequest request) {
    LOG.debug("Analyzing YAML file: {}", request.getFilePath());
    return blockingStub.analyzeYaml(request);
  }

  /**
   * Analyzes an HTML file containing embedded JavaScript.
   *
   * @param request the analysis request
   * @return the analysis response
   */
  public AnalyzeHtmlResponse analyzeHtml(AnalyzeHtmlRequest request) {
    LOG.debug("Analyzing HTML file: {}", request.getFilePath());
    return blockingStub.analyzeHtml(request);
  }

  /**
   * Analyzes an entire project with streaming results.
   * Replaces the WebSocket-based streaming.
   *
   * @param request the project analysis request
   * @param responseHandler handler for each streaming response
   */
  public void analyzeProject(
    AnalyzeProjectRequest request,
    Consumer<AnalyzeProjectResponse> responseHandler
  ) {
    LOG.info("Starting project analysis with {} files", request.getFilesCount());

    Iterator<AnalyzeProjectResponse> responses = blockingStub.analyzeProject(request);
    while (responses.hasNext()) {
      AnalyzeProjectResponse response = responses.next();
      responseHandler.accept(response);
    }

    LOG.info("Project analysis completed");
  }

  /**
   * Cancels any ongoing analysis.
   */
  public void cancelAnalysis() {
    LOG.info("Cancelling analysis");
    blockingStub.cancelAnalysis(CancelAnalysisRequest.newBuilder().build());
  }

  /**
   * Requests graceful shutdown of the bridge server.
   */
  public void requestClose() {
    LOG.info("Requesting bridge server shutdown");
    try {
      blockingStub.close(CloseRequest.newBuilder().build());
    } catch (StatusRuntimeException e) {
      // Server may close connection before sending response
      LOG.debug("Close request completed (server may have already shut down)");
    }
  }

  /**
   * Closes the gRPC channel.
   */
  @Override
  public void close() {
    LOG.debug("Closing gRPC channel");
    try {
      channel.shutdown().awaitTermination(SHUTDOWN_TIMEOUT_SECONDS, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      channel.shutdownNow();
    }
  }
}
```

#### Files Affected

| Action | File                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| CREATE | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeGrpcClient.java` |

#### Acceptance Criteria

- [ ] Client wraps all gRPC stubs (blocking for most, async available for future use)
- [ ] Health check verifies server is ready
- [ ] `waitForReady()` polls until server is available
- [ ] Max message size configured to 100MB
- [ ] Proper channel lifecycle management (shutdown with timeout)
- [ ] Timeout handling for health checks
- [ ] Logging at appropriate levels

---

### P3-T03: Create request/response converters for Java

**Description**: Create converter classes to transform between existing Java domain objects and gRPC message types.

**Files**:

- `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeRequestConverter.java`
- `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeResponseConverter.java`

**Estimated Effort**: 2 days

#### Technical Specification

##### BridgeRequestConverter.java

```java
package org.sonar.plugins.javascript.bridge;

import com.google.gson.Gson;
import java.util.List;
import java.util.Map;
import org.sonar.plugins.javascript.bridge.grpc.*;

/**
 * Converts Java domain objects to gRPC request messages.
 */
public class BridgeRequestConverter {

  private static final Gson GSON = new Gson();

  private BridgeRequestConverter() {
    // Utility class
  }

  /**
   * Converts linter initialization parameters to gRPC request.
   */
  public static InitLinterRequest toInitLinterRequest(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint,
    List<String> bundles,
    String rulesWorkdir
  ) {
    InitLinterRequest.Builder builder = InitLinterRequest.newBuilder()
      .addAllEnvironments(environments)
      .addAllGlobals(globals)
      .setBaseDir(baseDir)
      .setSonarlint(sonarlint)
      .addAllBundles(bundles)
      .setRulesWorkdir(rulesWorkdir);

    for (EslintRule rule : rules) {
      builder.addRules(toEslintRuleProto(rule));
    }

    return builder.build();
  }

  /**
   * Converts JS/TS analysis request to gRPC request.
   */
  public static AnalyzeJsTsRequest toAnalyzeJsTsRequest(BridgeServer.JsAnalysisRequest request) {
    AnalyzeJsTsRequest.Builder builder = AnalyzeJsTsRequest.newBuilder()
      .setFilePath(request.filePath())
      .setFileType(request.fileType())
      .setIgnoreHeaderComments(request.ignoreHeaderComments())
      .addAllTsConfigs(request.tsConfigs() != null ? request.tsConfigs() : List.of())
      .setFileStatus(request.fileStatus())
      .setAnalysisMode(request.analysisMode())
      .setSkipAst(request.skipAst())
      .setShouldClearDependenciesCache(request.shouldClearDependenciesCache())
      .setSonarlint(request.sonarlint())
      .setAllowTsParserJsFiles(request.allowTsParserJsFiles());

    if (request.fileContent() != null) {
      builder.setFileContent(request.fileContent());
    }
    if (request.programId() != null) {
      builder.setProgramId(request.programId());
    }
    if (request.configuration() != null) {
      builder.setConfiguration(toProjectConfigProto(request.configuration()));
    }

    return builder.build();
  }

  /**
   * Converts CSS analysis request to gRPC request.
   */
  public static AnalyzeCssRequest toAnalyzeCssRequest(BridgeServer.CssAnalysisRequest request) {
    AnalyzeCssRequest.Builder builder = AnalyzeCssRequest.newBuilder().setFilePath(
      request.filePath()
    );

    if (request.fileContent() != null) {
      builder.setFileContent(request.fileContent());
    }

    for (StylelintRule rule : request.rules()) {
      builder.addRules(toStylelintRuleProto(rule));
    }

    if (request.configuration() != null) {
      builder.setConfiguration(toProjectConfigProto(request.configuration()));
    }

    return builder.build();
  }

  /**
   * Converts YAML analysis request to gRPC request.
   */
  public static AnalyzeYamlRequest toAnalyzeYamlRequest(
    String filePath,
    String fileContent,
    ProjectAnalysisConfiguration configuration
  ) {
    AnalyzeYamlRequest.Builder builder = AnalyzeYamlRequest.newBuilder().setFilePath(filePath);

    if (fileContent != null) {
      builder.setFileContent(fileContent);
    }
    if (configuration != null) {
      builder.setConfiguration(toProjectConfigProto(configuration));
    }

    return builder.build();
  }

  /**
   * Converts HTML analysis request to gRPC request.
   */
  public static AnalyzeHtmlRequest toAnalyzeHtmlRequest(
    String filePath,
    String fileContent,
    ProjectAnalysisConfiguration configuration
  ) {
    AnalyzeHtmlRequest.Builder builder = AnalyzeHtmlRequest.newBuilder().setFilePath(filePath);

    if (fileContent != null) {
      builder.setFileContent(fileContent);
    }
    if (configuration != null) {
      builder.setConfiguration(toProjectConfigProto(configuration));
    }

    return builder.build();
  }

  /**
   * Converts project analysis request to gRPC request.
   */
  public static AnalyzeProjectRequest toAnalyzeProjectRequest(
    Map<String, JsTsFile> files,
    List<EslintRule> rules,
    ProjectAnalysisConfiguration configuration,
    List<String> bundles,
    String rulesWorkdir
  ) {
    AnalyzeProjectRequest.Builder builder = AnalyzeProjectRequest.newBuilder()
      .addAllBundles(bundles)
      .setRulesWorkdir(rulesWorkdir);

    for (Map.Entry<String, JsTsFile> entry : files.entrySet()) {
      builder.putFiles(entry.getKey(), toJsTsFileProto(entry.getValue()));
    }

    for (EslintRule rule : rules) {
      builder.addRules(toEslintRuleProto(rule));
    }

    if (configuration != null) {
      builder.setConfiguration(toProjectConfigProto(configuration));
    }

    return builder.build();
  }

  // ========== Private Helper Methods ==========

  private static org.sonar.plugins.javascript.bridge.grpc.EslintRule toEslintRuleProto(
    EslintRule rule
  ) {
    org.sonar.plugins.javascript.bridge.grpc.EslintRule.Builder builder =
      org.sonar.plugins.javascript.bridge.grpc.EslintRule.newBuilder()
        .setKey(rule.key())
        .addAllFileTypeTargets(rule.fileTypeTargets())
        .addAllAnalysisModes(rule.analysisModes())
        .addAllBlacklistedExtensions(rule.blacklistedExtensions())
        .setLanguage(rule.language());

    // Serialize configurations to JSON
    for (Object config : rule.configurations()) {
      builder.addConfigurations(GSON.toJson(config));
    }

    return builder.build();
  }

  private static org.sonar.plugins.javascript.bridge.grpc.StylelintRule toStylelintRuleProto(
    StylelintRule rule
  ) {
    org.sonar.plugins.javascript.bridge.grpc.StylelintRule.Builder builder =
      org.sonar.plugins.javascript.bridge.grpc.StylelintRule.newBuilder().setKey(rule.key());

    for (Object config : rule.configurations()) {
      builder.addConfigurations(GSON.toJson(config));
    }

    return builder.build();
  }

  private static org.sonar.plugins.javascript.bridge.grpc.JsTsFile toJsTsFileProto(JsTsFile file) {
    org.sonar.plugins.javascript.bridge.grpc.JsTsFile.Builder builder =
      org.sonar.plugins.javascript.bridge.grpc.JsTsFile.newBuilder()
        .setFilePath(file.filePath())
        .setFileType(file.fileType())
        .setFileStatus(file.fileStatus());

    if (file.fileContent() != null) {
      builder.setFileContent(file.fileContent());
    }

    return builder.build();
  }

  private static org.sonar.plugins.javascript.bridge.grpc.ProjectAnalysisConfiguration toProjectConfigProto(
    ProjectAnalysisConfiguration config
  ) {
    return org.sonar.plugins.javascript.bridge.grpc.ProjectAnalysisConfiguration.newBuilder()
      .setBaseDir(config.baseDir())
      .setSonarlint(config.sonarlint())
      .putAllFsEvents(config.fsEvents())
      .setAllowTsParserJsFiles(config.allowTsParserJsFiles())
      .setAnalysisMode(config.analysisMode())
      .setSkipAst(config.skipAst())
      .setIgnoreHeaderComments(config.ignoreHeaderComments())
      .setMaxFileSize(config.maxFileSize())
      .addAllEnvironments(config.environments())
      .addAllGlobals(config.globals())
      .addAllTsSuffixes(config.tsSuffixes())
      .addAllJsSuffixes(config.jsSuffixes())
      .addAllCssSuffixes(config.cssSuffixes())
      .addAllTsConfigPaths(config.tsConfigPaths())
      .addAllJsTsExclusions(config.jsTsExclusions())
      .addAllSources(config.sources())
      .addAllInclusions(config.inclusions())
      .addAllExclusions(config.exclusions())
      .addAllTests(config.tests())
      .addAllTestInclusions(config.testInclusions())
      .addAllTestExclusions(config.testExclusions())
      .setDetectBundles(config.detectBundles())
      .setCanAccessFileSystem(config.canAccessFileSystem())
      .build();
  }
}
```

##### BridgeResponseConverter.java

```java
package org.sonar.plugins.javascript.bridge;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.sonar.plugins.javascript.bridge.grpc.*;

/**
 * Converts gRPC response messages to Java domain objects.
 */
public class BridgeResponseConverter {

  private BridgeResponseConverter() {
    // Utility class
  }

  /**
   * Converts JS/TS analysis gRPC response to domain object.
   */
  public static BridgeServer.AnalysisResponse fromAnalyzeJsTsResponse(
    AnalyzeJsTsResponse response,
    String filePath
  ) {
    return new BridgeServer.AnalysisResponse(
      response.hasParsingError() ? fromParsingError(response.getParsingError()) : null,
      fromIssues(response.getIssuesList()),
      fromHighlights(response.getHighlightsList()),
      fromHighlightedSymbols(response.getHighlightedSymbolsList()),
      response.hasMetrics() ? fromMetrics(response.getMetrics()) : null,
      fromCpdTokens(response.getCpdTokensList()),
      response.hasAst() ? response.getAst().toByteArray() : null
    );
  }

  /**
   * Converts CSS analysis gRPC response to domain object.
   */
  public static BridgeServer.CssAnalysisResponse fromAnalyzeCssResponse(
    AnalyzeCssResponse response,
    String filePath
  ) {
    return new BridgeServer.CssAnalysisResponse(
      response.hasParsingError() ? fromParsingError(response.getParsingError()) : null,
      fromCssIssues(response.getIssuesList())
    );
  }

  /**
   * Converts YAML analysis gRPC response to domain object.
   */
  public static BridgeServer.EmbeddedAnalysisResponse fromAnalyzeYamlResponse(
    AnalyzeYamlResponse response
  ) {
    return new BridgeServer.EmbeddedAnalysisResponse(
      response.hasParsingError() ? fromParsingError(response.getParsingError()) : null,
      fromIssues(response.getIssuesList()),
      response.hasMetrics() ? fromEmbeddedMetrics(response.getMetrics()) : null
    );
  }

  /**
   * Converts HTML analysis gRPC response to domain object.
   */
  public static BridgeServer.EmbeddedAnalysisResponse fromAnalyzeHtmlResponse(
    AnalyzeHtmlResponse response
  ) {
    return new BridgeServer.EmbeddedAnalysisResponse(
      response.hasParsingError() ? fromParsingError(response.getParsingError()) : null,
      fromIssues(response.getIssuesList()),
      response.hasMetrics() ? fromEmbeddedMetrics(response.getMetrics()) : null
    );
  }

  /**
   * Converts streaming project analysis response.
   */
  public static Object fromAnalyzeProjectResponse(AnalyzeProjectResponse response) {
    switch (response.getResultCase()) {
      case FILE_RESULT:
        return new FileAnalysisResultWrapper(
          response.getFileResult().getFilename(),
          fromAnalyzeJsTsResponse(
            response.getFileResult().getAnalysis(),
            response.getFileResult().getFilename()
          )
        );
      case META:
        return new ProjectMetaWrapper(response.getMeta().getWarningsList());
      case CANCELLED:
        return new AnalysisCancelledWrapper();
      case ERROR:
        return new AnalysisErrorWrapper(
          response.getError().getCode(),
          response.getError().getMessage(),
          response.getError().hasStack() ? response.getError().getStack() : null
        );
      default:
        throw new IllegalArgumentException("Unknown response type: " + response.getResultCase());
    }
  }

  // ========== Private Helper Methods ==========

  private static BridgeServer.ParsingError fromParsingError(ParsingError error) {
    return new BridgeServer.ParsingError(
      error.getMessage(),
      error.hasLine() ? error.getLine() : null,
      error.getCode()
    );
  }

  private static List<BridgeServer.Issue> fromIssues(List<Issue> issues) {
    return issues.stream().map(BridgeResponseConverter::fromIssue).collect(Collectors.toList());
  }

  private static BridgeServer.Issue fromIssue(Issue issue) {
    return new BridgeServer.Issue(
      issue.getLine(),
      issue.getColumn(),
      issue.hasEndLine() ? issue.getEndLine() : null,
      issue.hasEndColumn() ? issue.getEndColumn() : null,
      issue.getMessage(),
      issue.getRuleId(),
      issue.getLanguage(),
      fromSecondaryLocations(issue.getSecondaryLocationsList()),
      issue.hasCost() ? issue.getCost() : null,
      fromQuickFixes(issue.getQuickFixesList()),
      new ArrayList<>(issue.getRuleEslintKeysList()),
      issue.getFilePath()
    );
  }

  private static List<BridgeServer.IssueLocation> fromSecondaryLocations(
    List<IssueLocation> locations
  ) {
    return locations
      .stream()
      .map(loc ->
        new BridgeServer.IssueLocation(
          loc.getLine(),
          loc.getColumn(),
          loc.getEndLine(),
          loc.getEndColumn(),
          loc.hasMessage() ? loc.getMessage() : null
        )
      )
      .collect(Collectors.toList());
  }

  private static List<BridgeServer.QuickFix> fromQuickFixes(List<QuickFix> quickFixes) {
    return quickFixes
      .stream()
      .map(qf ->
        new BridgeServer.QuickFix(
          qf.getMessage(),
          qf
            .getEditsList()
            .stream()
            .map(edit ->
              new BridgeServer.QuickFixEdit(
                edit.getText(),
                new BridgeServer.IssueLocation(
                  edit.getLoc().getLine(),
                  edit.getLoc().getColumn(),
                  edit.getLoc().getEndLine(),
                  edit.getLoc().getEndColumn(),
                  null
                )
              )
            )
            .collect(Collectors.toList())
        )
      )
      .collect(Collectors.toList());
  }

  private static List<BridgeServer.Highlight> fromHighlights(List<Highlight> highlights) {
    return highlights
      .stream()
      .map(h -> new BridgeServer.Highlight(fromLocation(h.getLocation()), h.getTextType()))
      .collect(Collectors.toList());
  }

  private static List<BridgeServer.HighlightedSymbol> fromHighlightedSymbols(
    List<HighlightedSymbol> symbols
  ) {
    return symbols
      .stream()
      .map(hs ->
        new BridgeServer.HighlightedSymbol(
          fromLocation(hs.getDeclaration()),
          hs
            .getReferencesList()
            .stream()
            .map(BridgeResponseConverter::fromLocation)
            .collect(Collectors.toList())
        )
      )
      .collect(Collectors.toList());
  }

  private static BridgeServer.Location fromLocation(Location location) {
    return new BridgeServer.Location(
      location.getStartLine(),
      location.getStartCol(),
      location.getEndLine(),
      location.getEndCol()
    );
  }

  private static BridgeServer.Metrics fromMetrics(Metrics metrics) {
    return new BridgeServer.Metrics(
      new ArrayList<>(metrics.getNclocList()),
      new ArrayList<>(metrics.getCommentLinesList()),
      new ArrayList<>(metrics.getNosonarLinesList()),
      new ArrayList<>(metrics.getExecutableLinesList()),
      metrics.getFunctions(),
      metrics.getStatements(),
      metrics.getClasses(),
      metrics.getComplexity(),
      metrics.getCognitiveComplexity()
    );
  }

  private static List<BridgeServer.CpdToken> fromCpdTokens(List<CpdToken> tokens) {
    return tokens
      .stream()
      .map(token -> new BridgeServer.CpdToken(fromLocation(token.getLocation()), token.getImage()))
      .collect(Collectors.toList());
  }

  private static List<BridgeServer.CssIssue> fromCssIssues(List<CssIssue> issues) {
    return issues
      .stream()
      .map(issue ->
        new BridgeServer.CssIssue(
          issue.getLine(),
          issue.getColumn(),
          issue.hasEndLine() ? issue.getEndLine() : null,
          issue.hasEndColumn() ? issue.getEndColumn() : null,
          issue.getMessage(),
          issue.getRuleId()
        )
      )
      .collect(Collectors.toList());
  }

  private static BridgeServer.EmbeddedMetrics fromEmbeddedMetrics(EmbeddedMetrics metrics) {
    return new BridgeServer.EmbeddedMetrics(new ArrayList<>(metrics.getNclocList()));
  }

  // ========== Wrapper Classes for Project Analysis Responses ==========

  public record FileAnalysisResultWrapper(
    String filename,
    BridgeServer.AnalysisResponse analysis
  ) {}

  public record ProjectMetaWrapper(List<String> warnings) {}

  public record AnalysisCancelledWrapper() {}

  public record AnalysisErrorWrapper(String code, String message, String stack) {}
}
```

#### Files Affected

| Action | File                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------- |
| CREATE | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeRequestConverter.java`  |
| CREATE | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeResponseConverter.java` |

#### Acceptance Criteria

- [ ] All request types converted correctly to protobuf messages
- [ ] All response types converted correctly to domain objects
- [ ] JSON configurations serialized properly using Gson
- [ ] Optional fields handled correctly (null checks)
- [ ] Lists handled correctly (null-safe)
- [ ] Unit tests cover all conversion methods
- [ ] Edge cases tested (empty lists, null values)

---

### P3-T04: Modify BridgeServerImpl to use gRPC

**Description**: Replace HTTP client calls with gRPC client calls in BridgeServerImpl.

**File**: `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeServerImpl.java`

**Estimated Effort**: 2 days

#### Technical Specification

Key modifications to `BridgeServerImpl.java`:

1. Replace `Http http` field with `BridgeGrpcClient grpcClient`
2. Update `startServer()` to establish gRPC connection
3. Update all analysis methods to use gRPC
4. Update `isAlive()` to use gRPC health check
5. Update `clean()` to close gRPC channel
6. Remove WebSocket connection code

```java
// Key changes in BridgeServerImpl.java

public class BridgeServerImpl implements BridgeServer {

  // Replace Http http with:
  private BridgeGrpcClient grpcClient;

  // In startServer():
  private void connect(int port) {
    grpcClient = new BridgeGrpcClient("localhost", port);
    if (!grpcClient.waitForReady(60_000)) {
      throw new IllegalStateException("Bridge server did not become ready in time");
    }
  }

  // Replace initLinter():
  @Override
  public void initLinter(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint,
    List<String> bundles,
    String rulesWorkdir
  ) {
    InitLinterRequest request = BridgeRequestConverter.toInitLinterRequest(
      rules,
      environments,
      globals,
      baseDir,
      sonarlint,
      bundles,
      rulesWorkdir
    );
    grpcClient.initLinter(request);
  }

  // Replace analyzeJavaScript/analyzeTypeScript:
  @Override
  public AnalysisResponse analyzeJsTs(JsAnalysisRequest request) {
    AnalyzeJsTsRequest grpcRequest = BridgeRequestConverter.toAnalyzeJsTsRequest(request);
    AnalyzeJsTsResponse grpcResponse = grpcClient.analyzeJsTs(grpcRequest);
    return BridgeResponseConverter.fromAnalyzeJsTsResponse(grpcResponse, request.filePath());
  }

  // Replace analyzeCss:
  @Override
  public CssAnalysisResponse analyzeCss(CssAnalysisRequest request) {
    AnalyzeCssRequest grpcRequest = BridgeRequestConverter.toAnalyzeCssRequest(request);
    AnalyzeCssResponse grpcResponse = grpcClient.analyzeCss(grpcRequest);
    return BridgeResponseConverter.fromAnalyzeCssResponse(grpcResponse, request.filePath());
  }

  // Replace isAlive:
  @Override
  public boolean isAlive() {
    return grpcClient != null && grpcClient.isAlive();
  }

  // Replace clean:
  @Override
  public void clean() {
    if (grpcClient != null) {
      try {
        grpcClient.requestClose();
      } catch (Exception e) {
        LOG.warn("Error requesting bridge shutdown", e);
      }
      grpcClient.close();
      grpcClient = null;
    }
  }
}
```

#### Files Affected

| Action | File                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| MODIFY | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeServerImpl.java` |

#### Acceptance Criteria

- [ ] All methods use gRPC instead of HTTP
- [ ] WebSocket code removed completely
- [ ] Existing method signatures preserved (no breaking changes to callers)
- [ ] Error handling preserves existing behavior (exceptions, logging)
- [ ] gRPC client lifecycle properly managed
- [ ] Unit tests pass with mock gRPC client

---

### P3-T05: Create gRPC-based project analysis handler

**Description**: Replace WebSocket message handler with gRPC streaming handler for project analysis.

**File**: `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/GrpcProjectAnalysisHandler.java`

**Estimated Effort**: 1 day

#### Technical Specification

```java
package org.sonar.plugins.javascript.bridge;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectResponse;

/**
 * Handles streaming gRPC responses for project analysis.
 * Replaces WebSocketMessageHandler.
 */
public class GrpcProjectAnalysisHandler implements Consumer<AnalyzeProjectResponse> {

  private static final Logger LOG = LoggerFactory.getLogger(GrpcProjectAnalysisHandler.class);

  private final SensorContext context;
  private final AnalysisResultProcessor resultProcessor;
  private final CompletableFuture<Void> completionFuture;
  private final List<String> warnings = new ArrayList<>();

  private int filesProcessed = 0;
  private boolean cancelled = false;
  private Exception error = null;

  public GrpcProjectAnalysisHandler(
    SensorContext context,
    AnalysisResultProcessor resultProcessor
  ) {
    this.context = context;
    this.resultProcessor = resultProcessor;
    this.completionFuture = new CompletableFuture<>();
  }

  @Override
  public void accept(AnalyzeProjectResponse response) {
    Object result = BridgeResponseConverter.fromAnalyzeProjectResponse(response);

    if (result instanceof BridgeResponseConverter.FileAnalysisResultWrapper fileResult) {
      handleFileResult(fileResult);
    } else if (result instanceof BridgeResponseConverter.ProjectMetaWrapper meta) {
      handleMeta(meta);
    } else if (result instanceof BridgeResponseConverter.AnalysisCancelledWrapper) {
      handleCancelled();
    } else if (result instanceof BridgeResponseConverter.AnalysisErrorWrapper errorWrapper) {
      handleError(errorWrapper);
    }
  }

  private void handleFileResult(BridgeResponseConverter.FileAnalysisResultWrapper result) {
    filesProcessed++;
    LOG.debug("Received analysis result for file: {}", result.filename());

    try {
      resultProcessor.processResult(context, result.filename(), result.analysis());
    } catch (Exception e) {
      LOG.error("Error processing result for file: {}", result.filename(), e);
      // Continue processing other files
    }
  }

  private void handleMeta(BridgeResponseConverter.ProjectMetaWrapper meta) {
    LOG.info("Project analysis completed. Files processed: {}", filesProcessed);
    warnings.addAll(meta.warnings());

    for (String warning : meta.warnings()) {
      LOG.warn("Analysis warning: {}", warning);
    }

    completionFuture.complete(null);
  }

  private void handleCancelled() {
    LOG.info(
      "Project analysis was cancelled. Files processed before cancellation: {}",
      filesProcessed
    );
    cancelled = true;
    completionFuture.complete(null);
  }

  private void handleError(BridgeResponseConverter.AnalysisErrorWrapper error) {
    LOG.error("Project analysis error [{}]: {}", error.code(), error.message());
    if (error.stack() != null) {
      LOG.debug("Error stack trace: {}", error.stack());
    }

    this.error = new RuntimeException(
      String.format("Analysis error [%s]: %s", error.code(), error.message())
    );
    completionFuture.completeExceptionally(this.error);
  }

  /**
   * Waits for the project analysis to complete.
   *
   * @throws Exception if analysis failed
   */
  public void awaitCompletion() throws Exception {
    completionFuture.get();
    if (error != null) {
      throw error;
    }
  }

  /**
   * Returns whether the analysis was cancelled.
   */
  public boolean wasCancelled() {
    return cancelled;
  }

  /**
   * Returns the number of files processed.
   */
  public int getFilesProcessed() {
    return filesProcessed;
  }

  /**
   * Returns any warnings from the analysis.
   */
  public List<String> getWarnings() {
    return new ArrayList<>(warnings);
  }
}

/**
 * Interface for processing individual file analysis results.
 */
@FunctionalInterface
interface AnalysisResultProcessor {
  void processResult(
    SensorContext context,
    String filename,
    BridgeServer.AnalysisResponse response
  );
}
```

#### Files Affected

| Action | File                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------- |
| CREATE | `sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/GrpcProjectAnalysisHandler.java` |
| MODIFY | Sensor classes that use project analysis                                                                |

#### Acceptance Criteria

- [ ] Streaming responses processed in order
- [ ] File results saved to SensorContext incrementally
- [ ] Completion tracked via CompletableFuture
- [ ] Cancellation supported and tracked
- [ ] Errors captured and propagated
- [ ] Warnings collected and available after completion
- [ ] Thread-safe for concurrent result processing

---

## Deliverables

1. Modified `sonar-plugin/bridge/pom.xml` with gRPC dependencies
2. Generated gRPC Java classes in `target/generated-sources`
3. `BridgeGrpcClient.java` - gRPC client wrapper
4. `BridgeRequestConverter.java` - Request conversion utilities
5. `BridgeResponseConverter.java` - Response conversion utilities
6. `GrpcProjectAnalysisHandler.java` - Streaming response handler
7. Modified `BridgeServerImpl.java` using gRPC

## Exit Criteria

- [ ] Maven build generates gRPC classes successfully
- [ ] All converter methods implemented and tested
- [ ] BridgeServerImpl uses gRPC for all communication
- [ ] Project analysis streaming works correctly
- [ ] All existing unit tests pass (with mocks updated)
- [ ] No HTTP or WebSocket code remains in active use

## Dependencies

- Phase 1 (proto file must exist)
- Phase 2 (Node.js server must implement BridgeService) - for integration testing

## Risks and Mitigations

| Risk                               | Impact | Likelihood | Mitigation                                                  |
| ---------------------------------- | ------ | ---------- | ----------------------------------------------------------- |
| Protobuf version conflicts         | High   | Medium     | Use shaded netty, check dependency tree                     |
| Generated code location issues     | Medium | Medium     | Configure build-helper-maven-plugin correctly               |
| Existing Java records mismatch     | High   | Medium     | Verify record structure matches proto before implementation |
| Thread safety in streaming handler | Medium | Low        | Use CompletableFuture for synchronization                   |
