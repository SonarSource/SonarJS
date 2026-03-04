/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForClassTypes.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.slf4j.event.Level;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.batch.sensor.issue.IssueLocation;
import org.sonar.api.batch.sensor.issue.internal.DefaultNoSonarFilter;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.css.CssRules;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.analysis.WebSensor.AnalyzeProjectHandler;
import org.sonar.plugins.javascript.analysis.cache.CacheTestUtils;
import org.sonar.plugins.javascript.api.JsAnalysisConsumer;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.EslintRule;
import org.sonar.plugins.javascript.bridge.JSWebSocketClient;
import org.sonar.plugins.javascript.bridge.PluginInfo;
import org.sonar.plugins.javascript.bridge.ServerAlreadyFailedException;
import org.sonar.plugins.javascript.bridge.WebSocketMessageHandler;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.bridge.protobuf.NodeType;
import org.sonar.plugins.javascript.bridge.protobuf.Position;
import org.sonar.plugins.javascript.bridge.protobuf.Program;
import org.sonar.plugins.javascript.bridge.protobuf.SourceLocation;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;
import org.sonar.plugins.javascript.sonarlint.FSListener;
import org.sonar.plugins.javascript.sonarlint.FSListenerImpl;

class WebSensorTest {

  public static final String PLUGIN_VERSION = "1.0";

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @TempDir
  Path baseDir;

  @Mock
  private BridgeServerImpl bridgeServerMock;

  private final TestAnalysisWarnings analysisWarnings = new TestAnalysisWarnings();
  private static final Gson GSON = new Gson();

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  private SensorContextTester context;

  private DefaultInputFile inputFile;

  private String nodeExceptionMessage =
    "Error while running Node.js. A supported version of Node.js is required for running the analysis of JS/TS files. Please make sure a supported version of Node.js is available in the PATH or an executable path is provided via 'sonar.nodejs.executable' property. Alternatively, you can exclude JS/TS files from your analysis using the 'sonar.exclusions' configuration property. See the docs for configuring the analysis environment: https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/languages/javascript-typescript-css/";

  private JSWebSocketClient webSocketClient;

  @TempDir
  Path tempDir;

  TempFolder tempFolder;

  @TempDir
  Path workDir;

  private AnalysisProcessor analysisProcessor;

  @BeforeEach
  void setUp() throws Exception {
    MockitoAnnotations.openMocks(this).close();

    // this is required to avoid the test to use real plugin version from the manifest
    PluginInfo.setVersion(PLUGIN_VERSION);
    tempFolder = new DefaultTempFolder(tempDir.toFile(), true);
    when(bridgeServerMock.isAlive()).thenReturn(true);
    when(bridgeServerMock.getCommandInfo()).thenReturn("bridgeServerMock command info");
    when(bridgeServerMock.getTelemetry()).thenReturn(
      new BridgeServer.TelemetryData(
        new BridgeServer.RuntimeTelemetry(Version.create(22, 9), "host")
      )
    );

    context = createSensorContext(baseDir);
    context.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 3),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    inputFile = createInputFile(context);
    webSocketClient = new JSWebSocketClient(new URI("ws://localhost:9001/"));

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
    analysisProcessor = new AnalysisProcessor(
      new DefaultNoSonarFilter(),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
  }

  private List<String> getWSMessages(BridgeServer.ProjectAnalysisOutputDTO response) {
    List<String> queue = new ArrayList<>();
    for (Map.Entry<String, BridgeServer.AnalysisResponseDTO> entry : response.files().entrySet()) {
      String key = entry.getKey();
      BridgeServer.AnalysisResponseDTO value = entry.getValue();
      JsonObject json = GSON.toJsonTree(value).getAsJsonObject();
      json.addProperty("filename", key);
      json.addProperty("messageType", "fileResult");
      queue.add(GSON.toJson(json));
    }
    JsonObject json = GSON.toJsonTree(response.meta()).getAsJsonObject();
    json.addProperty("messageType", "meta");
    queue.add(GSON.toJson(json));
    return queue;
  }

  @Test
  void should_have_descriptor() {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("JavaScript/TypeScript/CSS analysis");
    assertThat(descriptor.languages()).containsOnly("js", "ts", "css", "yaml", "web");
  }

  @Test
  void should_de_duplicate_issues() throws Exception {
    baseDir = Paths.get("src/test/resources/de-duplicate-issues");
    context = createSensorContext(baseDir);
    context.settings().setProperty(JavaScriptPlugin.ESLINT_REPORT_PATHS, "eslint-report.json");

    var content =
      "function addOne(i) {\n" +
      "    if (i != NaN) {\n" +
      "        return i ++\n" +
      "    } else {\n" +
      "      return\n" +
      "    }\n" +
      "};";

    inputFile = createInputFile(context, "file.js", StandardCharsets.ISO_8859_1, baseDir, content);

    var issueFilePath = Path.of(baseDir.toString(), "file.js").toAbsolutePath().toString();

    BridgeServer.AnalysisResponseDTO response = createResponse(
      List.of(
        new BridgeServer.Issue(
          1,
          1,
          2,
          1,
          "foo",
          "S3923",
          "js",
          List.of(),
          1.0,
          List.of(),
          List.of("foo-bar"),
          issueFilePath
        ),
        new BridgeServer.Issue(
          2,
          8,
          2,
          16,
          "foo",
          "S3923",
          "js",
          List.of(),
          1.0,
          List.of(),
          List.of("use-isnan"),
          issueFilePath
        )
      )
    );

    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(inputFile.absolutePath(), response);
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);

    var issues = context.allIssues();
    var externalIssues = context.allExternalIssues();

    assertThat(issues).hasSize(2);
    assertThat(externalIssues).hasSize(2);
  }

  @Test
  void should_analyze_project() {
    var expectedResponse = createProjectResponse(List.of(inputFile));
    executeSensorMockingResponse(expectedResponse);

    assertThat(context.allIssues()).hasSize(
      expectedResponse.files().get(inputFile.absolutePath()).issues().size()
    );
    assertThat(logTester.logs(Level.DEBUG)).contains(
      String.format("Saving issue for rule S3923 on file %s at line 1", inputFile)
    );

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue firstIssue = issues.next();
    Issue secondIssue = issues.next();

    IssueLocation location = firstIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4))
    );

    location = secondIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Line issue message");
    assertThat(location.textRange()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 9))
    );

    assertThat(firstIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(secondIssue.ruleKey().rule()).isEqualTo("S3923");

    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0).get(0)).isEqualTo(
      TypeOfText.KEYWORD
    );
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1).get(0)).isEqualTo(
      TypeOfText.CONSTANT
    );
    assertThat(context.highlightingTypeAt(inputFile.key(), 3, 0)).isEmpty();

    Collection<TextRange> symbols = context.referencesForSymbolAt(inputFile.key(), 1, 3);
    assertThat(symbols).hasSize(1);
    assertThat(symbols.iterator().next()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(2, 1), new DefaultTextPointer(2, 5))
    );

    assertThat(context.measure(inputFile.key(), CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(inputFile.key(), CoreMetrics.STATEMENTS).value()).isEqualTo(2);
    assertThat(context.measure(inputFile.key(), CoreMetrics.CLASSES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.NCLOC).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMMENT_LINES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMPLEXITY).value()).isEqualTo(4);
    assertThat(
      context.measure(inputFile.key(), CoreMetrics.COGNITIVE_COMPLEXITY).value()
    ).isEqualTo(5);

    assertThat(context.cpdTokens(inputFile.key())).hasSize(2);
  }

  @Test
  void should_ignore_ws_messages_not_related_to_project_analysis() {
    executeSensorMockingEvents(() -> {
      webSocketClient.onMessage("{messageType: 'unrelated_event'}");
      for (var message : getWSMessages(createProjectResponse(List.of(inputFile)))) {
        webSocketClient.onMessage(message);
      }
    });
  }

  @Test
  void should_end_analysis_error_ws_event() {
    assertThatThrownBy(() ->
      executeSensorMockingEvents(() -> {
        webSocketClient.onError(new IOException("Abnormal termination"));
      })
    ).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void should_end_analysis_close_ws_event() {
    assertThatThrownBy(() ->
      executeSensorMockingEvents(() -> {
        webSocketClient.onClose(1006, "Abnormal close event", true);
      })
    ).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void should_handle_warnings() {
    var warningMessage = "warning message";
    var expectedResponse = new BridgeServer.ProjectAnalysisOutputDTO(
      createFilesMap(List.of(inputFile)),
      new BridgeServer.ProjectAnalysisMetaResponse(List.of(warningMessage))
    );
    executeSensorMockingResponse(expectedResponse);
    assertThat(analysisWarnings.warnings).isEqualTo(List.of(warningMessage));
  }

  @Test
  void should_explode_if_no_response_from_project_analysis() {
    doThrow(new IllegalStateException("error")).when(bridgeServerMock).analyzeProject(any());
    var sensor = createSensor();
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");

    assertThat(logTester.logs(Level.ERROR)).contains("Failed to get response from analysis");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  void should_raise_a_parsing_error() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ parsingError: { line: 3, message: \"Parse error message\", code: \"Parsing\"} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );
    executeSensorMockingResponse(expectedResponse);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange().start().line()).isEqualTo(3);
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(Level.WARN)).contains(
      "Failed to parse file [dir/file.ts] at line 3: Parse error message"
    );
  }

  @Test
  void should_not_create_parsing_issue_when_no_rule() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ parsingError: { line: 3, message: \"Parse error message\", code: \"Parsing\"} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );
    executeSensorMockingResponse(
      createSensor(checks("S3923", "S1451"), new AnalysisConsumers(), null),
      expectedResponse
    );
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).isEmpty();
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(Level.WARN)).contains(
      "Failed to parse file [dir/file.ts] at line 3: Parse error message"
    );
  }

  @Test
  void should_raise_a_parsing_error_without_line() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ parsingError: { message: \"Parse error message\"} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );
    executeSensorMockingResponse(expectedResponse);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange()).isNull(); // file level issueCheckListTest.testTypeScriptChecks
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file.ts]: Parse error message"
    );
  }

  @Test
  void should_send_skipAst_flag_when_there_are_no_consumers() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .skipAst()
    ).isTrue();
  }

  @Test
  void should_send_skipAst_flag_when_consumer_is_disabled() {
    JsAnalysisConsumer disabled = createConsumer(false);
    assertThat(
      executeSensorAndCaptureHandler(createSensorWithConsumer(disabled), context)
        .getRequest()
        .getConfiguration()
        .skipAst()
    ).isTrue();
  }

  @Test
  void should_not_send_the_skipAst_flag_when_there_are_consumers() {
    assertThat(
      executeSensorAndCaptureHandler(createSensorWithConsumer(), context)
        .getRequest()
        .getConfiguration()
        .skipAst()
    ).isFalse();
  }

  @Test
  void should_send_createTSProgramForOrphanFiles_true_by_default() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .createTSProgramForOrphanFiles()
    ).isTrue();
  }

  @Test
  void should_send_createTSProgramForOrphanFiles_false_when_disabled() {
    context.setSettings(
      new MapSettings().setProperty(JavaScriptPlugin.CREATE_TS_PROGRAM_FOR_ORPHAN_FILES, "false")
    );
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .createTSProgramForOrphanFiles()
    ).isFalse();
  }

  @Test
  void should_send_disableTypeChecking_false_by_default() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .disableTypeChecking()
    ).isFalse();
  }

  @Test
  void should_send_disableTypeChecking_true_when_enabled() {
    context.setSettings(
      new MapSettings().setProperty(JavaScriptPlugin.DISABLE_TYPE_CHECKING, "true")
    );
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .disableTypeChecking()
    ).isTrue();
  }

  @Test
  void should_not_send_content() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getFiles()
        .get(inputFile.absolutePath())
        .fileContent()
    ).isNull();
  }

  @Test
  void should_send_content_on_sonarlint() throws Exception {
    setSonarLintRuntime(context);
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getFiles()
        .get(inputFile.absolutePath())
        .fileContent()
    ).isEqualTo(inputFile.contents());
  }

  @Test
  void should_send_content_when_not_utf8() {
    String content = "if (cond)\ndoFoo(); \nelse \ndoFoo();";
    var inputFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("dir/file.js").toFile()
    )
      .setLanguage("js")
      .setCharset(StandardCharsets.ISO_8859_1)
      .setContents(content)
      .build();
    context.fileSystem().add(inputFile);
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getFiles()
        .get(inputFile.absolutePath())
        .fileContent()
    ).isEqualTo(content);
  }

  @Test
  void should_log_when_failing_typescript() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ parsingError: { message: \"Debug Failure. False expression.\", code: \"" +
                BridgeServer.ParsingErrorCode.FAILING_TYPESCRIPT +
                "\"} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );
    executeSensorMockingResponse(expectedResponse);
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file.ts] from TypeScript: Debug Failure. False expression."
    );
  }

  @Test
  void should_stop_when_no_input_files() throws Exception {
    createSensor().execute(createSensorContext(baseDir));
    assertThat(logTester.logs()).contains(
      "No input files found for analysis",
      "Hit the cache for 0 out of 0",
      "Miss the cache for 0 out of 0"
    );
  }

  @Test
  void should_fail_fast() {
    doThrow(new IllegalStateException("error")).when(bridgeServerMock).analyzeProject(any());
    var sensor = createSensor();
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");
  }

  @Test
  void should_fail_fast_with_parsing_error_without_line() {
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ parsingError: { message: \"Parse error message\"} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    assertThatThrownBy(() -> executeSensorMockingResponse(expectedResponse))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file.ts]: Parse error message"
    );
  }

  @Test
  void do_not_start_analysis_if_cancelled() {
    context.setCancelled(true);
    createSensor().execute(context);
    assertThat(logTester.logs(Level.INFO)).contains(
      "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
    );
  }

  @Test
  void stop_analysis_if_cancelled() {
    var expectedResponse = createProjectResponse(List.of(inputFile));
    JSWebSocketClient spyClient = Mockito.spy(webSocketClient);
    Mockito.doNothing().when(spyClient).send(Mockito.anyString());

    executeSensorMockingEvents(() -> {
      var messages = getWSMessages(expectedResponse);
      context.setCancelled(true);
      spyClient.onMessage(messages.get(0));
      Mockito.verify(spyClient).send(GSON.toJson(Map.of("type", "on-cancel-analysis")));
      spyClient.onMessage("{messageType: 'cancelled'}");
    });
    assertThat(logTester.logs(Level.INFO)).contains(
      "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
    );
  }

  @Test
  void handle_errors_gracefully_during_analyze_project() {
    var jsError = "{\"code\":\"GENERAL_ERROR\",\"message\":\"Fake error message\"}";
    var message = String.format("{messageType: 'error', error: %s}", jsError);
    JSWebSocketClient spyClient = Mockito.spy(webSocketClient);
    Mockito.doNothing().when(spyClient).send(Mockito.anyString());

    var exception = catchThrowable(() ->
      executeSensorMockingEvents(() -> {
        spyClient.onMessage(message);
      })
    );
    assertThat(exception)
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");
    assertThat(exception.getCause().getMessage()).isEqualTo(
      String.format("java.lang.RuntimeException: Received error from bridge: %s", jsError)
    );
  }

  @Test
  void should_save_cached_cpd() throws IOException {
    context = CacheTestUtils.createContextWithCache(
      baseDir,
      workDir,
      inputFile.getModuleRelativePath()
    );
    context.fileSystem().add(inputFile);
    inputFile.setStatus(InputFile.Status.SAME);
    executeSensor();
    assertThat(context.cpdTokens(inputFile.key())).hasSize(2);
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Processing cache analysis of file: " + inputFile.uri()
    );
  }

  @Test
  void should_not_invoke_analysis_consumers_when_cannot_deserialize() {
    Node erroneousNode = Node.newBuilder().setType(NodeType.BlockStatementType).build();
    var consumer = createConsumer();
    var expectedResponse = createProjectResponseWithAst(inputFile, erroneousNode);
    executeSensorMockingResponse(createSensorWithConsumer(consumer), expectedResponse);
    assertThat(consumer.files).isEmpty();
    assertThat(consumer.done).isTrue();

    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Failed to deserialize AST for file: " + inputFile.uri()
    );
  }

  @Test
  void should_invoke_analysis_consumers_when_analyzing_project() {
    var consumer = createConsumer();

    Program program = Program.newBuilder().build();
    Node placeHolderNode = Node.newBuilder()
      .setType(NodeType.ProgramType)
      .setProgram(program)
      .setLoc(
        SourceLocation.newBuilder()
          .setStart(Position.newBuilder().setLine(1).setColumn(1))
          .setEnd(Position.newBuilder().setLine(1).setColumn(1))
      )
      .build();

    executeSensorMockingResponse(
      createSensorWithConsumer(consumer),
      createProjectResponseWithAst(inputFile, placeHolderNode)
    );
    assertThat(consumer.files).hasSize(1);
    assertThat(consumer.files.get(0).inputFile()).isEqualTo(inputFile);
    assertThat(consumer.done).isTrue();
  }

  @Test
  void should_not_invoke_analysis_consumers_when_cannot_deserialize_project_analysis() {
    var consumer = createConsumer();

    Node erroneousNode = Node.newBuilder().setType(NodeType.BlockStatementType).build();

    executeSensorMockingResponse(
      createSensorWithConsumer(consumer),
      createProjectResponseWithAst(inputFile, erroneousNode)
    );
    assertThat(consumer.files).isEmpty();
    assertThat(consumer.done).isTrue();

    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Failed to deserialize AST for file: " + inputFile.uri()
    );
  }

  @Test
  void should_create_issues() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ issues: [{" +
                "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", \"secondaryLocations\": []}," +
                "{\"line\":1,\"column\":1,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Line issue message\", \"secondaryLocations\": []}," +
                "{\"line\":0,\"column\":1,\"ruleId\":\"S1451\",\"language\":\"js\",\"message\":\"File issue message\", \"secondaryLocations\": []}" +
                "]}",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(context.allIssues()).hasSize(3);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue firstIssue = issues.next();
    Issue secondIssue = issues.next();
    Issue thirdIssue = issues.next();

    IssueLocation location = firstIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4))
    );

    location = secondIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Line issue message");
    assertThat(location.textRange()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 9))
    );

    location = thirdIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("File issue message");
    assertThat(location.textRange()).isNull();

    assertThat(firstIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(secondIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(thirdIssue.ruleKey().rule()).isEqualTo("S1451");
    assertThat(logTester.logs(Level.WARN)).doesNotContain(
      "Custom JavaScript rules are deprecated and API will be removed in future version."
    );
  }

  @Test
  void should_set_quickfix_available() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ issues: [{" +
                "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", \"secondaryLocations\": []," +
                "\"quickFixes\": [{ message: \"msg\", edits: [] }] " +
                "}" +
                "]}",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );
    executeSensorMockingResponse(expectedResponse);
    assertThat(context.allIssues()).hasSize(1);
    var issue = context.allIssues().iterator().next();
    assertThat(issue.isQuickFixAvailable()).isTrue();
  }

  @Test
  void should_set_quickfix_now_available() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ issues: [{" +
                "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", \"secondaryLocations\": []," +
                "\"quickFixes\": [{ message: \"msg\", edits: [] }] " +
                "}" +
                "]}",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );
    context.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 1),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    executeSensorMockingResponse(expectedResponse);
    assertThat(context.allIssues()).hasSize(1);
    var issue = context.allIssues().iterator().next();
    assertThat(issue.isQuickFixAvailable()).isFalse();
  }

  @Test
  void should_report_secondary_issue_locations() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ issues: [{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", " +
                "\"cost\": 14," +
                "\"secondaryLocations\": [" +
                "{ message: \"Secondary\", \"line\":2,\"column\":0,\"endLine\":2,\"endColumn\":3}," +
                "{ message: \"Secondary\", \"line\":3,\"column\":1,\"endLine\":3,\"endColumn\":4}" +
                "]}]}",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    assertThat(issue.gap()).isEqualTo(14);

    assertThat(issue.flows()).hasSize(2);

    IssueLocation secondary1 = issue.flows().get(0).locations().get(0);
    assertThat(secondary1.inputComponent()).isEqualTo(inputFile);
    assertThat(secondary1.message()).isEqualTo("Secondary");
    assertThat(secondary1.textRange()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(2, 0), new DefaultTextPointer(2, 3))
    );

    IssueLocation secondary2 = issue.flows().get(1).locations().get(0);
    assertThat(secondary2.inputComponent()).isEqualTo(inputFile);
    assertThat(secondary2.message()).isEqualTo("Secondary");
    assertThat(secondary2.textRange()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(3, 1), new DefaultTextPointer(3, 4))
    );
  }

  @Test
  void should_not_report_secondary_when_location_are_null() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ issues: [{\"line\":1,\"column\":3,\"endLine\":3,\"endColumn\":5,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", " +
                "\"secondaryLocations\": [" +
                "{ message: \"Secondary\", \"line\":2,\"column\":1,\"endLine\":null,\"endColumn\":4}" +
                "]}]}",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    assertThat(issue.flows()).isEmpty();
  }

  @Test
  void should_report_cost() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ issues: [{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", " +
                "\"cost\": 42," +
                "\"secondaryLocations\": []}]}",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    IssueLocation location = issue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange()).isEqualTo(
      new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4))
    );

    assertThat(issue.gap()).isEqualTo(42);
    assertThat(issue.flows()).isEmpty();
  }

  @Test
  void should_save_metrics() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ metrics: {\"ncloc\":[1, 2, 3],\"commentLines\":[4, 5, 6],\"nosonarLines\":[7, 8, 9],\"executableLines\":[10, 11, 12],\"functions\":1,\"statements\":2,\"classes\":3,\"complexity\":4,\"cognitiveComplexity\":5} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(context.measure(inputFile.key(), CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(inputFile.key(), CoreMetrics.STATEMENTS).value()).isEqualTo(2);
    assertThat(context.measure(inputFile.key(), CoreMetrics.CLASSES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.NCLOC).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMMENT_LINES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMPLEXITY).value()).isEqualTo(4);
    assertThat(
      context.measure(inputFile.key(), CoreMetrics.COGNITIVE_COMPLEXITY).value()
    ).isEqualTo(5);
  }

  @Test
  void should_save_only_nosonar_metric_in_sonarlint() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ metrics: {\"nosonarLines\":[7, 8, 9]} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    context.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    executeSensorMockingResponse(createSonarLintSensor(), expectedResponse);

    assertThat(inputFile.hasNoSonarAt(7)).isTrue();
    assertThat(context.measures(inputFile.key())).isEmpty();
    assertThat((context.cpdTokens(inputFile.key()))).isNull();
  }

  @Test
  void should_save_only_nosonar_metric_for_test() {
    DefaultInputFile testInputFile = createTestInputFile(context);
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ metrics: {\"nosonarLines\":[7, 8, 9], ncloc: [], commentLines: [], executableLines: []} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
          put(
            testInputFile.absolutePath(),
            GSON.fromJson(
              "{ metrics: {\"nosonarLines\":[7, 8, 9], ncloc: [], commentLines: [], executableLines: []} }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(testInputFile.hasNoSonarAt(7)).isTrue();
    assertThat(context.measures(testInputFile.key())).isEmpty();
    assertThat((context.cpdTokens(testInputFile.key()))).isNull();

    assertThat(inputFile.hasNoSonarAt(7)).isTrue();
    assertThat(context.measures(inputFile.key())).hasSize(7);
    assertThat((context.cpdTokens(inputFile.key()))).isEmpty();
  }

  @Test
  void should_save_highlights() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(
              "{ highlights: [{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"textType\":\"KEYWORD\"},{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"textType\":\"CONSTANT\"}] }",
              BridgeServer.AnalysisResponseDTO.class
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0).get(0)).isEqualTo(
      TypeOfText.KEYWORD
    );
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1).get(0)).isEqualTo(
      TypeOfText.CONSTANT
    );
    assertThat(context.highlightingTypeAt(inputFile.key(), 3, 0)).isEmpty();
  }

  @Test
  void should_save_cpd() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            GSON.fromJson(CacheTestUtils.CPD_TOKENS, BridgeServer.AnalysisResponseDTO.class)
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(context.cpdTokens(inputFile.key())).hasSize(2);
  }

  @Test
  void should_catch_if_bridge_server_not_started() throws Exception {
    doThrow(new IllegalStateException("Failed to start the bridge server"))
      .when(bridgeServerMock)
      .startServerLazily(any());

    var sensor = createSensor();
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");

    assertThat(logTester.logs(Level.ERROR)).contains("Failure during analysis");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  void should_have_configured_rules() {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    builder.addRule(
      new NewActiveRule.Builder()
        .setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, "S1192"))
        .build()
    ); // no-duplicate-string, default config
    builder.addRule(
      new NewActiveRule.Builder()
        .setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, "S1479"))
        .setParam("maximum", "42")
        .build()
    ); // max-switch-cases
    builder.addRule(
      new NewActiveRule.Builder()
        .setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, "S3923"))
        .build()
    ); // S3923, without config
    CheckFactory checkFactory = new CheckFactory(builder.build());

    var checks = new JsTsChecks(checkFactory);
    List<EslintRule> rules = checks.enabledEslintRules();

    assertThat(rules).hasSize(3);

    assertThat(rules.get(0).getKey()).isEqualTo("S1192");
    @SuppressWarnings("unchecked")
    var configuration = (Map<String, Object>) rules.get(0).getConfigurations().get(0);
    assertThat(configuration).containsEntry("threshold", 3);
    assertThat(configuration).containsEntry("ignoreStrings", "application/json");

    assertThat(rules.get(1).getKey()).isEqualTo("S1479");
    assertThat(rules.get(1).getConfigurations()).containsExactly(42);

    assertThat(rules.get(2).getKey()).isEqualTo("S3923");
    assertThat(rules.get(2).getConfigurations()).isEmpty();
  }

  @Test
  void should_skip_analysis_when_no_files() throws IOException {
    createSensor().execute(createSensorContext(baseDir));
    assertThat(logTester.logs(Level.INFO)).contains("No input files found for analysis");
  }

  @Test
  void handle_missing_node() throws Exception {
    doThrow(new NodeCommandException("Exception Message", new IOException()))
      .when(bridgeServerMock)
      .startServerLazily(any());

    var sensor = createSensor();
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage(nodeExceptionMessage);

    assertThat(logTester.logs(Level.ERROR)).contains("Exception Message");
  }

  @Test
  void log_debug_if_already_failed_server() throws Exception {
    doThrow(new ServerAlreadyFailedException()).when(bridgeServerMock).startServerLazily(any());
    createSensor().execute(context);

    assertThat(logTester.logs()).contains(
      "Skipping the start of the bridge server as it failed to start during the first analysis or it's not answering anymore",
      "No rules will be executed"
    );
  }

  @Test
  void should_fail_fast_with_nodecommandexception() throws Exception {
    doThrow(new NodeCommandException("error")).when(bridgeServerMock).startServerLazily(any());
    var sensor = createSensor();
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage(nodeExceptionMessage);
  }

  @Test
  void should_add_telemetry_for_scanner_analysis() {
    when(bridgeServerMock.getTelemetry()).thenReturn(
      new BridgeServer.TelemetryData(
        new BridgeServer.RuntimeTelemetry(Version.create(22, 9), "embedded")
      )
    );
    context.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(10, 9),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    createSensor().execute(context);
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Telemetry saved: {javascript.runtime.major-version=22, javascript.runtime.version=22.9, javascript.runtime.node-executable-origin=embedded}"
    );
  }

  private AnalyzeProjectHandler executeSensorAndCaptureHandler(
    WebSensor sensor,
    SensorContextTester ctx
  ) {
    ArgumentCaptor<AnalyzeProjectHandler> captor = ArgumentCaptor.forClass(
      AnalyzeProjectHandler.class
    );
    sensor.execute(ctx);
    verify(bridgeServerMock).analyzeProject(captor.capture());
    return captor.getValue();
  }

  private void executeSensor() {
    executeSensorMockingResponse(createSensor(), createProjectResponse(List.of()));
  }

  private void executeSensorMockingResponse(
    BridgeServer.ProjectAnalysisOutputDTO expectedResponse
  ) {
    executeSensorMockingResponse(createSensor(), expectedResponse);
  }

  private void executeSensorMockingResponse(
    WebSensor sensor,
    BridgeServer.ProjectAnalysisOutputDTO expectedResponse
  ) {
    executeSensorMockingEvents(sensor, () -> {
      for (var message : getWSMessages(expectedResponse)) {
        webSocketClient.onMessage(message);
      }
    });
  }

  private void executeSensorMockingEvents(Runnable events) {
    executeSensorMockingEvents(createSensor(), events);
  }

  private void executeSensorMockingEvents(WebSensor sensor, Runnable events) {
    doAnswer(invocation -> {
      WebSocketMessageHandler<AnalyzeProjectHandler> handler = invocation.getArgument(0);
      handler.getRequest(); // we need to call this to prepare all the Maps in the sensor
      webSocketClient.registerHandler(handler);
      assertThat(webSocketClient.getMessageHandlers()).hasSize(1);
      events.run();
      return handler.getFuture().join();
    })
      .when(bridgeServerMock)
      .analyzeProject(any());
    sensor.execute(context);
    assertThat(webSocketClient.getMessageHandlers()).isEmpty();
  }

  private SensorContextTester createSensorContext(Path baseDir) throws IOException {
    SensorContextTester ctx = null;
    if (isWindows()) {
      // toRealPath avoids 8.3 paths on Windows, which clashes with tests where test file location is checked
      // https://en.wikipedia.org/wiki/8.3_filename
      ctx = SensorContextTester.create(baseDir.toRealPath());
    } else {
      ctx = SensorContextTester.create(baseDir);
    }

    ctx.fileSystem().setWorkDir(workDir);
    ctx.setNextCache(mock(WriteCache.class));
    ctx.setPreviousCache(mock(ReadCache.class));
    return ctx;
  }

  private DefaultInputFile createTestInputFile(SensorContextTester context) {
    var inputFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("dir/test.js").toFile()
    )
      .setLanguage("js")
      .setType(InputFile.Type.TEST)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private TestJsAnalysisConsumer createConsumer() {
    return createConsumer(true);
  }

  private TestJsAnalysisConsumer createConsumer(boolean enabled) {
    return new TestJsAnalysisConsumer(enabled);
  }

  private WebSensor createSensorWithConsumer() {
    return createSensorWithConsumer(createConsumer());
  }

  private WebSensor createSensorWithConsumer(JsAnalysisConsumer consumer) {
    return createSensor(
      checks("S3923", "S2260", "S1451"),
      new AnalysisConsumers(List.of(consumer)),
      null
    );
  }

  private WebSensor createSensor() {
    return createSensor(checks("S3923", "S2260", "S1451"), new AnalysisConsumers(), null);
  }

  private WebSensor createSonarLintSensor() {
    return createSensor(
      checks("S3923", "S2260", "S1451"),
      new AnalysisConsumers(),
      new FSListenerImpl()
    );
  }

  private WebSensor createSensor(
    JsTsChecks checks,
    AnalysisConsumers consumers,
    @Nullable FSListener fsListener
  ) {
    return new WebSensor(
      checks,
      bridgeServerMock,
      analysisProcessor,
      analysisWarnings,
      consumers,
      mock(CssRules.class),
      fsListener
    );
  }

  private BridgeServer.ProjectAnalysisOutputDTO createProjectResponse(List<InputFile> files) {
    return new BridgeServer.ProjectAnalysisOutputDTO(
      createFilesMap(files),
      new BridgeServer.ProjectAnalysisMetaResponse()
    );
  }

  private BridgeServer.ProjectAnalysisOutputDTO createProjectResponse(
    Map<String, BridgeServer.AnalysisResponseDTO> results
  ) {
    return new BridgeServer.ProjectAnalysisOutputDTO(
      results,
      new BridgeServer.ProjectAnalysisMetaResponse()
    );
  }

  private BridgeServer.ProjectAnalysisOutputDTO createProjectResponseWithAst(
    InputFile inputFile,
    Node node
  ) {
    var analysisResponse = new BridgeServer.AnalysisResponseDTO(
      null,
      List.of(),
      List.of(),
      List.of(),
      new BridgeServer.Metrics(),
      List.of(),
      Base64.getEncoder().encodeToString(node.toByteArray())
    );

    var files = new HashMap<String, BridgeServer.AnalysisResponseDTO>() {
      {
        put(inputFile.absolutePath(), analysisResponse);
      }
    };

    return new BridgeServer.ProjectAnalysisOutputDTO(
      files,
      new BridgeServer.ProjectAnalysisMetaResponse()
    );
  }

  private Map<String, BridgeServer.AnalysisResponseDTO> createFilesMap(List<InputFile> files) {
    return new HashMap<>() {
      {
        files.forEach(file -> put(file.absolutePath(), createResponse()));
      }
    };
  }

  private BridgeServer.AnalysisResponseDTO createResponse(List<BridgeServer.Issue> issues) {
    return new BridgeServer.AnalysisResponseDTO(
      null,
      issues,
      List.of(),
      List.of(),
      new BridgeServer.Metrics(),
      List.of(),
      null
    );
  }

  private BridgeServer.AnalysisResponseDTO createResponse() {
    return GSON.fromJson(
      "{" +
        createIssues() +
        "," +
        createHighlights() +
        "," +
        createMetrics() +
        "," +
        createCpdTokens() +
        "," +
        createHighlightedSymbols() +
        "}",
      BridgeServer.AnalysisResponseDTO.class
    );
  }

  private String createIssues() {
    return (
      "issues: [" +
      "{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", " +
      createSecondaryLocations() +
      ", \"ruleESLintKeys\": []}," +
      "{\"line\":1,\"column\":1,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Line issue message\", \"secondaryLocations\": [], \"ruleESLintKeys\": []}" +
      "]"
    );
  }

  private String createSecondaryLocations() {
    return (
      "secondaryLocations: [" +
      "{ message: \"Secondary\", \"line\":2,\"column\":0,\"endLine\":2,\"endColumn\":3}," +
      "{ message: \"Secondary\", \"line\":3,\"column\":1,\"endLine\":3,\"endColumn\":4}" +
      "]"
    );
  }

  private String createHighlights() {
    return (
      "highlights: [" +
      "{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"textType\":\"KEYWORD\"}," +
      "{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"textType\":\"CONSTANT\"}" +
      "]"
    );
  }

  private String createHighlightedSymbols() {
    return (
      "highlightedSymbols: [{" +
      "\"declaration\": {\"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4}," +
      "\"references\": [{\"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5}]" +
      "}]"
    );
  }

  private String createMetrics() {
    return (
      "metrics: {" +
      "\"ncloc\":[1, 2, 3]," +
      "\"commentLines\":[4, 5, 6]," +
      "\"nosonarLines\":[7, 8, 9]," +
      "\"executableLines\":[10, 11, 12]," +
      "\"functions\":1," +
      "\"statements\":2," +
      "\"classes\":3," +
      "\"complexity\":4," +
      "\"cognitiveComplexity\":5" +
      "}"
    );
  }

  private String createCpdTokens() {
    return (
      "cpdTokens: [" +
      "{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"image\":\"LITERAL\"}," +
      "{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"image\":\"if\"}" +
      "]"
    );
  }

  private DefaultInputFile createInputFile(SensorContextTester context) {
    return createInputFile(context, "dir/file.ts");
  }

  private DefaultInputFile createInputFile(SensorContextTester context, String relativePath) {
    return createInputFile(context, relativePath, StandardCharsets.UTF_8);
  }

  private DefaultInputFile createInputFile(
    SensorContextTester context,
    String relativePath,
    Charset charset
  ) {
    return createInputFile(context, relativePath, charset, baseDir);
  }

  private DefaultInputFile createInputFile(
    SensorContextTester context,
    String relativePath,
    Charset charset,
    Path baseDir
  ) {
    return createInputFile(
      context,
      relativePath,
      charset,
      baseDir,
      "if (cond)\ndoFoo(); \nelse \ndoFoo();"
    );
  }

  private DefaultInputFile createInputFile(
    SensorContextTester context,
    String relativePath,
    Charset charset,
    Path baseDir,
    String contents
  ) {
    DefaultInputFile inputFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve(relativePath).toFile()
    )
      .setLanguage("ts")
      .setCharset(charset)
      .setContents(contents)
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private void setSonarLintRuntime(SensorContextTester context) {
    context.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(8, 9)));
  }

  private boolean isWindows() {
    var osName = System.getProperty("os.name");
    return osName.toLowerCase().startsWith("win");
  }

  private static JsTsChecks checks(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(
        new NewActiveRule.Builder()
          .setRuleKey(RuleKey.of(CheckList.TS_REPOSITORY_KEY, ruleKey))
          .setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, ruleKey))
          .build()
      );
    }
    return new JsTsChecks(new CheckFactory(builder.build()));
  }

  class TestJsAnalysisConsumer implements JsAnalysisConsumer {

    public final List<JsFile> files = new ArrayList<>();
    public boolean done;
    public boolean enabled;

    TestJsAnalysisConsumer() {
      this(true);
    }

    TestJsAnalysisConsumer(boolean enabled) {
      this.enabled = enabled;
    }

    @Override
    public void accept(JsFile jsFile) {
      files.add(jsFile);
    }

    @Override
    public void doneAnalysis(SensorContext context) {
      done = true;
    }

    @Override
    public boolean isEnabled() {
      return this.enabled;
    }
  }
}
