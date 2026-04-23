/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.protobuf.ByteString;
import com.google.protobuf.Empty;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletionException;
import javax.annotation.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
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
import org.sonar.plugins.javascript.analysis.cache.CacheTestUtils;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalysisLanguage;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectStreamResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.CpdToken;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileResultMessage;
import org.sonar.plugins.javascript.analyzeproject.grpc.Highlight;
import org.sonar.plugins.javascript.analyzeproject.grpc.HighlightedSymbol;
import org.sonar.plugins.javascript.analyzeproject.grpc.Location;
import org.sonar.plugins.javascript.analyzeproject.grpc.Metrics;
import org.sonar.plugins.javascript.analyzeproject.grpc.ParsingError;
import org.sonar.plugins.javascript.analyzeproject.grpc.ParsingErrorCode;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisFileResult;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisMeta;
import org.sonar.plugins.javascript.analyzeproject.grpc.QuickFix;
import org.sonar.plugins.javascript.analyzeproject.grpc.QuickFixEdit;
import org.sonar.plugins.javascript.analyzeproject.grpc.TextType;
import org.sonar.plugins.javascript.api.JsAnalysisConsumer;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.EslintRule;
import org.sonar.plugins.javascript.bridge.PluginInfo;
import org.sonar.plugins.javascript.bridge.ProjectAnalysisHandler;
import org.sonar.plugins.javascript.bridge.ServerAlreadyFailedException;
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
  private BridgeServer bridgeServerMock;

  private final TestAnalysisWarnings analysisWarnings = new TestAnalysisWarnings();
  private static final Gson GSON = new Gson();

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  private SensorContextTester context;

  private DefaultInputFile inputFile;

  private String nodeExceptionMessage =
    "Error while running Node.js. A supported version of Node.js is required for running the analysis of JS/TS files. Please make sure a supported version of Node.js is available in the PATH or an executable path is provided via 'sonar.nodejs.executable' property. Alternatively, you can exclude JS/TS files from your analysis using the 'sonar.exclusions' configuration property. See the docs for configuring the analysis environment: https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/languages/javascript-typescript-css/";

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
    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
    analysisProcessor = new AnalysisProcessor(
      new DefaultNoSonarFilter(),
      fileLinesContextFactory,
      mock(CssRules.class)
    );
  }

  private List<AnalyzeProjectStreamResponse> getAnalysisStreamMessages(
    ProjectAnalysisOutput response
  ) {
    List<AnalyzeProjectStreamResponse> queue = new ArrayList<>();
    for (Map.Entry<String, ProjectAnalysisFileResult> entry : response.files().entrySet()) {
      queue.add(
        AnalyzeProjectStreamResponse.newBuilder()
          .setFileResult(
            FileResultMessage.newBuilder()
              .setFilePath(entry.getKey())
              .setResult(entry.getValue())
              .build()
          )
          .build()
      );
    }
    queue.add(AnalyzeProjectStreamResponse.newBuilder().setMeta(response.meta()).build());
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

    ProjectAnalysisFileResult response = createResponse(
      List.of(
        org.sonar.plugins.javascript.analyzeproject.grpc.Issue.newBuilder()
          .setLine(1)
          .setColumn(1)
          .setEndLine(2)
          .setEndColumn(1)
          .setMessage("foo")
          .setRuleId("S3923")
          .setLanguage(AnalysisLanguage.ANALYSIS_LANGUAGE_JS)
          .setCost(1.0)
          .addRuleEslintKeys("foo-bar")
          .setFilePath(issueFilePath)
          .build(),
        org.sonar.plugins.javascript.analyzeproject.grpc.Issue.newBuilder()
          .setLine(2)
          .setColumn(8)
          .setEndLine(2)
          .setEndColumn(16)
          .setMessage("foo")
          .setRuleId("S3923")
          .setLanguage(AnalysisLanguage.ANALYSIS_LANGUAGE_JS)
          .setCost(1.0)
          .addRuleEslintKeys("use-isnan")
          .setFilePath(issueFilePath)
          .build()
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
      expectedResponse.files().get(inputFile.absolutePath()).getIssuesCount()
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
  void should_ignore_stream_messages_not_related_to_project_analysis() {
    executeSensorMockingEvents(handler -> {
      dispatchAnalysisStreamMessage(handler, AnalyzeProjectStreamResponse.getDefaultInstance());
      for (var message : getAnalysisStreamMessages(createProjectResponse(List.of(inputFile)))) {
        dispatchAnalysisStreamMessage(handler, message);
      }
    });
  }

  @Test
  void should_handle_warnings() {
    var warningMessage = "warning message";
    var expectedResponse = new ProjectAnalysisOutput(
      createFilesMap(List.of(inputFile)),
      ProjectAnalysisMeta.newBuilder().addWarnings(warningMessage).build()
    );
    executeSensorMockingResponse(expectedResponse);
    assertThat(analysisWarnings.warnings).isEqualTo(List.of(warningMessage));
  }

  @Test
  void should_explode_if_no_response_from_project_analysis() {
    doThrow(new IllegalStateException("error"))
      .when(bridgeServerMock)
      .analyzeProject(any(ProjectAnalysisHandler.class));
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
            parseLegacyResponse(
              "{ parsingErrors: [{ line: 3, column: 4, message: \"Parse error message\", code: \"Parsing\", language: \"ts\"}] }"
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
    assertThat(issue.primaryLocation().textRange().start().lineOffset()).isEqualTo(4);
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
            parseLegacyResponse(
              "{ parsingErrors: [{ line: 3, message: \"Parse error message\", code: \"Parsing\", language: \"ts\"}] }"
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
            parseLegacyResponse(
              "{ parsingErrors: [{ message: \"Parse error message\", language: \"ts\"}] }"
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
        .getSkipAst()
    ).isTrue();
  }

  @Test
  void should_send_skipAst_flag_when_consumer_is_disabled() {
    JsAnalysisConsumer disabled = createConsumer(false);
    assertThat(
      executeSensorAndCaptureHandler(createSensorWithConsumer(disabled), context)
        .getRequest()
        .getConfiguration()
        .getSkipAst()
    ).isTrue();
  }

  @Test
  void should_not_send_the_skipAst_flag_when_there_are_consumers() {
    assertThat(
      executeSensorAndCaptureHandler(createSensorWithConsumer(), context)
        .getRequest()
        .getConfiguration()
        .getSkipAst()
    ).isFalse();
  }

  @Test
  void should_send_createTSProgramForOrphanFiles_true_by_default() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .getCreateTsProgramForOrphanFiles()
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
        .getCreateTsProgramForOrphanFiles()
    ).isFalse();
  }

  @Test
  void should_send_disableTypeChecking_false_by_default() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .getDisableTypeChecking()
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
        .getDisableTypeChecking()
    ).isTrue();
  }

  @Test
  void should_send_skipNodeModuleLookupOutsideBaseDir_false_by_default() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .getSkipNodeModuleLookupOutsideBaseDir()
    ).isFalse();
  }

  @Test
  void should_send_skipNodeModuleLookupOutsideBaseDir_true_when_enabled() {
    context.setSettings(
      new MapSettings().setProperty(
        "sonar.internal.analysis.skipNodeModuleLookupOutsideBaseDir",
        "true"
      )
    );
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getConfiguration()
        .getSkipNodeModuleLookupOutsideBaseDir()
    ).isTrue();
  }

  @Test
  void should_send_html_yaml_and_css_additional_suffixes_to_bridge_configuration() {
    context.setSettings(
      new MapSettings()
        .setProperty(JavaScriptPlugin.HTML_FILE_SUFFIXES_KEY, ".custom-html")
        .setProperty(JavaScriptPlugin.YAML_FILE_SUFFIXES_KEY, ".custom-yaml")
        .setProperty(JavaScriptPlugin.CSS_ADDITIONAL_FILE_SUFFIXES_KEY, ".custom-style")
    );

    var configuration = executeSensorAndCaptureHandler(createSensor(), context)
      .getRequest()
      .getConfiguration();
    assertThat(configuration.getHtmlSuffixes().getValuesList()).containsExactly(".custom-html");
    assertThat(configuration.getYamlSuffixes().getValuesList()).containsExactly(".custom-yaml");
    assertThat(configuration.getCssAdditionalSuffixes().getValuesList()).containsExactly(
      ".custom-style"
    );
  }

  @Test
  void should_normalize_suffixes_before_sending_to_bridge_configuration() {
    context.setSettings(
      new MapSettings()
        .setProperty(JavaScriptPlugin.HTML_FILE_SUFFIXES_KEY, " CUSTOM-HTML ")
        .setProperty(JavaScriptPlugin.YAML_FILE_SUFFIXES_KEY, ".CUSTOM-YAML")
        .setProperty(JavaScriptPlugin.CSS_ADDITIONAL_FILE_SUFFIXES_KEY, " custom-style ")
    );

    var configuration = executeSensorAndCaptureHandler(createSensor(), context)
      .getRequest()
      .getConfiguration();
    assertThat(configuration.getHtmlSuffixes().getValuesList()).containsExactly(".custom-html");
    assertThat(configuration.getYamlSuffixes().getValuesList()).containsExactly(".custom-yaml");
    assertThat(configuration.getCssAdditionalSuffixes().getValuesList()).containsExactly(
      ".custom-style"
    );
  }

  @Test
  void should_select_html_yaml_and_css_additional_files_using_configured_extensions() {
    context.setSettings(
      new MapSettings()
        .setProperty(JavaScriptPlugin.HTML_FILE_SUFFIXES_KEY, ".custom-html")
        .setProperty(JavaScriptPlugin.YAML_FILE_SUFFIXES_KEY, ".custom-yaml")
        .setProperty(JavaScriptPlugin.CSS_ADDITIONAL_FILE_SUFFIXES_KEY, ".custom-style")
    );

    var htmlFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("dir/template.custom-html").toFile()
    )
      .setLanguage("text")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("<template>{{ value }}</template>")
      .build();
    var yamlFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("dir/template.custom-yaml").toFile()
    )
      .setLanguage("text")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("Transform: AWS::Serverless-2016-10-31\nRuntime: nodejs18.x\nResources: {}")
      .build();
    var cssAdditionalFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("dir/component.custom-style").toFile()
    )
      .setLanguage("text")
      .setType(InputFile.Type.MAIN)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("<style>.a { color: red; }</style>")
      .build();
    context.fileSystem().add(htmlFile);
    context.fileSystem().add(yamlFile);
    context.fileSystem().add(cssAdditionalFile);

    var requestFiles = executeSensorAndCaptureHandler(createSensor(), context)
      .getRequest()
      .getFiles();
    assertThat(requestFiles).containsKeys(
      htmlFile.absolutePath(),
      yamlFile.absolutePath(),
      cssAdditionalFile.absolutePath()
    );
  }

  @Test
  void should_not_send_content() {
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getFiles()
        .get(inputFile.absolutePath())
        .hasFileContent()
    ).isFalse();
  }

  @Test
  void should_send_content_on_sonarlint() throws Exception {
    setSonarLintRuntime(context);
    assertThat(
      executeSensorAndCaptureHandler(createSensor(), context)
        .getRequest()
        .getFiles()
        .get(inputFile.absolutePath())
        .getFileContent()
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
        .getFileContent()
    ).isEqualTo(content);
  }

  @Test
  void should_fail_request_build_when_reading_file_content_fails() throws IOException {
    context = createSensorContext(baseDir);
    setSonarLintRuntime(context);
    var failingInputFile = spy(
      new TestInputFileBuilder(
        "moduleKey",
        baseDir.toFile(),
        baseDir.resolve("dir/file.ts").toFile()
      )
        .setLanguage("ts")
        .setCharset(StandardCharsets.UTF_8)
        .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
        .build()
    );
    doThrow(new IOException("boom")).when(failingInputFile).contents();
    context.fileSystem().add(failingInputFile);

    var handler = executeSensorAndCaptureHandler(createSensor(), context);

    assertThatThrownBy(handler::getRequest)
      .isInstanceOf(IllegalStateException.class)
      .hasCauseInstanceOf(IOException.class);
    assertThatThrownBy(() -> handler.getFuture().join())
      .isInstanceOf(CompletionException.class)
      .hasCauseInstanceOf(IllegalStateException.class);
  }

  @Test
  void should_log_when_failing_typescript() {
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            parseLegacyResponse(
              "{ parsingErrors: [{ message: \"Debug Failure. False expression.\", code: \"" +
                ParsingErrorCode.PARSING_ERROR_CODE_FAILING_TYPESCRIPT +
                "\", language: \"ts\"}] }"
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
    doThrow(new IllegalStateException("error"))
      .when(bridgeServerMock)
      .analyzeProject(any(ProjectAnalysisHandler.class));
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
            parseLegacyResponse(
              "{ parsingErrors: [{ message: \"Parse error message\", language: \"ts\"}] }"
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
  void should_not_fail_fast_with_css_parsing_error_without_line() {
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    var expectedResponse = createProjectResponse(
      new HashMap<>() {
        {
          put(
            inputFile.absolutePath(),
            parseLegacyResponse(
              "{ parsingErrors: [{ message: \"Parse error message\", language: \"css\"}] }"
            )
          );
        }
      }
    );

    executeSensorMockingResponse(expectedResponse);
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file.ts]: Parse error message"
    );
    assertThat(context.allAnalysisErrors()).hasSize(1);
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
    executeSensorMockingEvents(handler -> {
      var messages = getAnalysisStreamMessages(expectedResponse);
      context.setCancelled(true);
      dispatchAnalysisStreamMessage(handler, messages.get(0));
      dispatchAnalysisStreamMessage(
        handler,
        AnalyzeProjectStreamResponse.newBuilder().setCancelled(Empty.getDefaultInstance()).build()
      );
    });
    assertThat(logTester.logs(Level.INFO)).contains(
      "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
    );
  }

  @Test
  void handle_errors_gracefully_during_analyze_project() {
    var jsError = "{\"code\":\"GENERAL_ERROR\",\"message\":\"Fake error message\"}";

    var exception = catchThrowable(() ->
      executeSensorMockingEvents(handler -> {
        dispatchAnalysisStreamError(handler, jsError);
      })
    );
    assertThat(exception)
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");
    assertThat(exception.getCause().getMessage()).isEqualTo(
      String.format("java.lang.RuntimeException: Received error from analyzer runtime: %s", jsError)
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
            parseLegacyResponse(
              "{ issues: [{" +
                "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", \"secondaryLocations\": []}," +
                "{\"line\":1,\"column\":1,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Line issue message\", \"secondaryLocations\": []}," +
                "{\"line\":0,\"column\":1,\"ruleId\":\"S1451\",\"language\":\"js\",\"message\":\"File issue message\", \"secondaryLocations\": []}" +
                "]}"
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
            parseLegacyResponse(
              "{ issues: [{" +
                "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", \"secondaryLocations\": []," +
                "\"quickFixes\": [{ message: \"msg\", edits: [] }] " +
                "}" +
                "]}"
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
            parseLegacyResponse(
              "{ issues: [{" +
                "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", \"secondaryLocations\": []," +
                "\"quickFixes\": [{ message: \"msg\", edits: [] }] " +
                "}" +
                "]}"
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
            parseLegacyResponse(
              "{ issues: [{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", " +
                "\"cost\": 14," +
                "\"secondaryLocations\": [" +
                "{ message: \"Secondary\", \"line\":2,\"column\":0,\"endLine\":2,\"endColumn\":3}," +
                "{ message: \"Secondary\", \"line\":3,\"column\":1,\"endLine\":3,\"endColumn\":4}" +
                "]}]}"
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
            parseLegacyResponse(
              "{ issues: [{\"line\":1,\"column\":3,\"endLine\":3,\"endColumn\":5,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", " +
                "\"secondaryLocations\": [" +
                "{ message: \"Secondary\", \"line\":2,\"column\":1,\"endLine\":null,\"endColumn\":4}" +
                "]}]}"
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
            parseLegacyResponse(
              "{ issues: [{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"language\":\"js\",\"message\":\"Issue message\", " +
                "\"cost\": 42," +
                "\"secondaryLocations\": []}]}"
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
            parseLegacyResponse(
              "{ metrics: {\"ncloc\":[1, 2, 3],\"commentLines\":[4, 5, 6],\"nosonarLines\":[7, 8, 9],\"executableLines\":[10, 11, 12],\"functions\":1,\"statements\":2,\"classes\":3,\"complexity\":4,\"cognitiveComplexity\":5} }"
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
            parseLegacyResponse("{ metrics: {\"nosonarLines\":[7, 8, 9]} }")
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
            parseLegacyResponse(
              "{ metrics: {\"nosonarLines\":[7, 8, 9], ncloc: [], commentLines: [], executableLines: []} }"
            )
          );
          put(
            testInputFile.absolutePath(),
            parseLegacyResponse(
              "{ metrics: {\"nosonarLines\":[7, 8, 9], ncloc: [], commentLines: [], executableLines: []} }"
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
            parseLegacyResponse(
              "{ highlights: [{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"textType\":\"KEYWORD\"},{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"textType\":\"CONSTANT\"}] }"
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
          put(inputFile.absolutePath(), parseLegacyResponse(CacheTestUtils.CPD_TOKENS));
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

  @Test
  void should_ignore_results_for_unknown_files() {
    var unknownFilePath = baseDir.resolve("dir/unknown.ts").toAbsolutePath().toString();

    executeSensorMockingEvents(handler -> {
      dispatchAnalysisStreamMessage(
        handler,
        AnalyzeProjectStreamResponse.newBuilder()
          .setFileResult(
            FileResultMessage.newBuilder()
              .setFilePath(unknownFilePath)
              .setResult(ProjectAnalysisFileResult.getDefaultInstance())
              .build()
          )
          .build()
      );
      dispatchAnalysisStreamMessage(
        handler,
        AnalyzeProjectStreamResponse.newBuilder()
          .setMeta(ProjectAnalysisMeta.getDefaultInstance())
          .build()
      );
    });

    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(Level.WARN)).contains(
      "Skipping analysis result for unknown file path: " + unknownFilePath
    );
  }

  private ProjectAnalysisHandler executeSensorAndCaptureHandler(
    WebSensor sensor,
    SensorContextTester ctx
  ) {
    ArgumentCaptor<ProjectAnalysisHandler> captor = ArgumentCaptor.forClass(
      ProjectAnalysisHandler.class
    );
    sensor.execute(ctx);
    verify(bridgeServerMock).analyzeProject(captor.capture());
    return captor.getValue();
  }

  private void executeSensor() {
    executeSensorMockingResponse(createSensor(), createProjectResponse(List.of()));
  }

  private void executeSensorMockingResponse(ProjectAnalysisOutput expectedResponse) {
    executeSensorMockingResponse(createSensor(), expectedResponse);
  }

  private void executeSensorMockingResponse(
    WebSensor sensor,
    ProjectAnalysisOutput expectedResponse
  ) {
    executeSensorMockingEvents(sensor, handler -> {
      for (var message : getAnalysisStreamMessages(expectedResponse)) {
        dispatchAnalysisStreamMessage(handler, message);
      }
    });
  }

  private void executeSensorMockingEvents(
    java.util.function.Consumer<ProjectAnalysisHandler> events
  ) {
    executeSensorMockingEvents(createSensor(), events);
  }

  private void executeSensorMockingEvents(
    WebSensor sensor,
    java.util.function.Consumer<ProjectAnalysisHandler> events
  ) {
    doAnswer(invocation -> {
      ProjectAnalysisHandler handler = invocation.getArgument(0);
      handler.getRequest(); // we need to call this to prepare all the Maps in the sensor
      events.accept(handler);
      return handler.getFuture().join();
    })
      .when(bridgeServerMock)
      .analyzeProject(any(ProjectAnalysisHandler.class));
    sensor.execute(context);
  }

  private static void dispatchAnalysisStreamMessage(
    ProjectAnalysisHandler handler,
    AnalyzeProjectStreamResponse message
  ) {
    handler.handleMessage(message);
  }

  private static void dispatchAnalysisStreamError(ProjectAnalysisHandler handler, String error) {
    handler
      .getFuture()
      .completeExceptionally(
        new RuntimeException(String.format("Received error from analyzer runtime: %s", error))
      );
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

  private record ProjectAnalysisOutput(
    Map<String, ProjectAnalysisFileResult> files,
    ProjectAnalysisMeta meta
  ) {}

  private ProjectAnalysisOutput createProjectResponse(List<InputFile> files) {
    return new ProjectAnalysisOutput(
      createFilesMap(files),
      ProjectAnalysisMeta.getDefaultInstance()
    );
  }

  private ProjectAnalysisOutput createProjectResponse(
    Map<String, ProjectAnalysisFileResult> results
  ) {
    return new ProjectAnalysisOutput(results, ProjectAnalysisMeta.getDefaultInstance());
  }

  private ProjectAnalysisOutput createProjectResponseWithAst(InputFile inputFile, Node node) {
    var analysisResponse = ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .setAst(ByteString.copyFrom(node.toByteArray()))
      .build();

    var files = new HashMap<String, ProjectAnalysisFileResult>() {
      {
        put(inputFile.absolutePath(), analysisResponse);
      }
    };

    return new ProjectAnalysisOutput(files, ProjectAnalysisMeta.getDefaultInstance());
  }

  private Map<String, ProjectAnalysisFileResult> createFilesMap(List<InputFile> files) {
    return new HashMap<>() {
      {
        files.forEach(file -> put(file.absolutePath(), createResponse()));
      }
    };
  }

  private ProjectAnalysisFileResult createResponse(
    List<org.sonar.plugins.javascript.analyzeproject.grpc.Issue> issues
  ) {
    return ProjectAnalysisFileResult.newBuilder()
      .setMetrics(Metrics.getDefaultInstance())
      .addAllIssues(issues)
      .build();
  }

  private ProjectAnalysisFileResult createResponse() {
    return parseLegacyResponse(
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
        "}"
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

  private ProjectAnalysisFileResult parseLegacyResponse(String json) {
    var builder = ProjectAnalysisFileResult.newBuilder();

    JsonObject root = GSON.fromJson(json, JsonObject.class);
    if (root == null) {
      return builder.setMetrics(Metrics.getDefaultInstance()).build();
    }

    if (root.has("parsingErrors") && root.get("parsingErrors").isJsonArray()) {
      root
        .getAsJsonArray("parsingErrors")
        .forEach(error -> {
          if (error.isJsonObject()) {
            builder.addParsingErrors(parseParsingError(error.getAsJsonObject()));
          }
        });
    }

    if (root.has("issues") && root.get("issues").isJsonArray()) {
      root
        .getAsJsonArray("issues")
        .forEach(issue -> {
          if (issue.isJsonObject()) {
            builder.addIssues(parseIssue(issue.getAsJsonObject()));
          }
        });
    }

    if (root.has("highlights") && root.get("highlights").isJsonArray()) {
      root
        .getAsJsonArray("highlights")
        .forEach(highlight -> {
          if (highlight.isJsonObject()) {
            builder.addHighlights(parseHighlight(highlight.getAsJsonObject()));
          }
        });
    }

    if (root.has("highlightedSymbols") && root.get("highlightedSymbols").isJsonArray()) {
      root
        .getAsJsonArray("highlightedSymbols")
        .forEach(symbol -> {
          if (symbol.isJsonObject()) {
            builder.addHighlightedSymbols(parseHighlightedSymbol(symbol.getAsJsonObject()));
          }
        });
    }

    if (root.has("metrics") && root.get("metrics").isJsonObject()) {
      builder.setMetrics(parseMetrics(root.getAsJsonObject("metrics")));
    } else {
      builder.setMetrics(Metrics.getDefaultInstance());
    }

    if (root.has("cpdTokens") && root.get("cpdTokens").isJsonArray()) {
      root
        .getAsJsonArray("cpdTokens")
        .forEach(cpdToken -> {
          if (cpdToken.isJsonObject()) {
            builder.addCpdTokens(parseCpdToken(cpdToken.getAsJsonObject()));
          }
        });
    }

    if (root.has("error") && !root.get("error").isJsonNull()) {
      builder.setError(root.get("error").getAsString());
    }

    return builder.build();
  }

  private static ParsingError parseParsingError(JsonObject json) {
    var builder = ParsingError.newBuilder();
    if (json.has("message") && !json.get("message").isJsonNull()) {
      builder.setMessage(json.get("message").getAsString());
    }
    if (json.has("line") && !json.get("line").isJsonNull()) {
      builder.setLine(json.get("line").getAsInt());
    }
    if (json.has("column") && !json.get("column").isJsonNull()) {
      builder.setColumn(json.get("column").getAsInt());
    }
    builder.setCode(parseParsingErrorCode(json.get("code")));
    builder.setLanguage(parseAnalysisLanguage(json.get("language")));
    return builder.build();
  }

  private static org.sonar.plugins.javascript.analyzeproject.grpc.Issue parseIssue(
    JsonObject json
  ) {
    var builder = org.sonar.plugins.javascript.analyzeproject.grpc.Issue.newBuilder()
      .setLine(optionalInt(json.get("line")))
      .setColumn(optionalInt(json.get("column")))
      .setMessage(optionalString(json.get("message")))
      .setRuleId(optionalString(json.get("ruleId")))
      .setLanguage(parseAnalysisLanguage(json.get("language")));

    if (json.has("endLine") && !json.get("endLine").isJsonNull()) {
      builder.setEndLine(json.get("endLine").getAsInt());
    }
    if (json.has("endColumn") && !json.get("endColumn").isJsonNull()) {
      builder.setEndColumn(json.get("endColumn").getAsInt());
    }
    if (json.has("secondaryLocations") && json.get("secondaryLocations").isJsonArray()) {
      json
        .getAsJsonArray("secondaryLocations")
        .forEach(location -> {
          if (location.isJsonObject()) {
            builder.addSecondaryLocations(parseIssueLocation(location.getAsJsonObject()));
          }
        });
    }
    if (json.has("cost") && !json.get("cost").isJsonNull()) {
      builder.setCost(json.get("cost").getAsDouble());
    }
    if (json.has("quickFixes") && json.get("quickFixes").isJsonArray()) {
      json
        .getAsJsonArray("quickFixes")
        .forEach(quickFix -> {
          if (quickFix.isJsonObject()) {
            builder.addQuickFixes(parseQuickFix(quickFix.getAsJsonObject()));
          }
        });
    }
    String ruleEslintKeysField = json.has("ruleEslintKeys") ? "ruleEslintKeys" : "ruleESLintKeys";
    if (json.has(ruleEslintKeysField) && json.get(ruleEslintKeysField).isJsonArray()) {
      json
        .getAsJsonArray(ruleEslintKeysField)
        .forEach(key -> {
          if (!key.isJsonNull()) {
            builder.addRuleEslintKeys(key.getAsString());
          }
        });
    }
    if (json.has("filePath") && !json.get("filePath").isJsonNull()) {
      builder.setFilePath(json.get("filePath").getAsString());
    }
    return builder.build();
  }

  private static org.sonar.plugins.javascript.analyzeproject.grpc.IssueLocation parseIssueLocation(
    JsonObject json
  ) {
    var builder = org.sonar.plugins.javascript.analyzeproject.grpc.IssueLocation.newBuilder();
    if (json.has("line") && !json.get("line").isJsonNull()) {
      builder.setLine(json.get("line").getAsInt());
    }
    if (json.has("column") && !json.get("column").isJsonNull()) {
      builder.setColumn(json.get("column").getAsInt());
    }
    if (json.has("endLine") && !json.get("endLine").isJsonNull()) {
      builder.setEndLine(json.get("endLine").getAsInt());
    }
    if (json.has("endColumn") && !json.get("endColumn").isJsonNull()) {
      builder.setEndColumn(json.get("endColumn").getAsInt());
    }
    if (json.has("message") && !json.get("message").isJsonNull()) {
      builder.setMessage(json.get("message").getAsString());
    }
    return builder.build();
  }

  private static QuickFix parseQuickFix(JsonObject json) {
    var builder = QuickFix.newBuilder();
    if (json.has("message") && !json.get("message").isJsonNull()) {
      builder.setMessage(json.get("message").getAsString());
    }
    if (json.has("edits") && json.get("edits").isJsonArray()) {
      json
        .getAsJsonArray("edits")
        .forEach(edit -> {
          if (edit.isJsonObject()) {
            builder.addEdits(parseQuickFixEdit(edit.getAsJsonObject()));
          }
        });
    }
    return builder.build();
  }

  private static QuickFixEdit parseQuickFixEdit(JsonObject json) {
    var builder = QuickFixEdit.newBuilder();
    if (json.has("text") && !json.get("text").isJsonNull()) {
      builder.setText(json.get("text").getAsString());
    }
    if (json.has("loc") && json.get("loc").isJsonObject()) {
      builder.setLoc(parseIssueLocation(json.getAsJsonObject("loc")));
    }
    return builder.build();
  }

  private static Highlight parseHighlight(JsonObject json) {
    var builder = Highlight.newBuilder();
    if (json.has("location") && json.get("location").isJsonObject()) {
      builder.setLocation(parseLocation(json.getAsJsonObject("location")));
    }
    builder.setTextType(parseTextType(json.get("textType")));
    return builder.build();
  }

  private static HighlightedSymbol parseHighlightedSymbol(JsonObject json) {
    var builder = HighlightedSymbol.newBuilder();
    if (json.has("declaration") && json.get("declaration").isJsonObject()) {
      builder.setDeclaration(parseLocation(json.getAsJsonObject("declaration")));
    }
    if (json.has("references") && json.get("references").isJsonArray()) {
      json
        .getAsJsonArray("references")
        .forEach(reference -> {
          if (reference.isJsonObject()) {
            builder.addReferences(parseLocation(reference.getAsJsonObject()));
          }
        });
    }
    return builder.build();
  }

  private static CpdToken parseCpdToken(JsonObject json) {
    var builder = CpdToken.newBuilder();
    if (json.has("location") && json.get("location").isJsonObject()) {
      builder.setLocation(parseLocation(json.getAsJsonObject("location")));
    }
    if (json.has("image") && !json.get("image").isJsonNull()) {
      builder.setImage(json.get("image").getAsString());
    }
    return builder.build();
  }

  private static Location parseLocation(JsonObject json) {
    return Location.newBuilder()
      .setStartLine(optionalInt(json.get("startLine")))
      .setStartCol(optionalInt(json.get("startCol")))
      .setEndLine(optionalInt(json.get("endLine")))
      .setEndCol(optionalInt(json.get("endCol")))
      .build();
  }

  private static Metrics parseMetrics(JsonObject json) {
    var builder = Metrics.newBuilder();
    if (json.has("ncloc") && json.get("ncloc").isJsonArray()) {
      json.getAsJsonArray("ncloc").forEach(value -> builder.addNcloc(value.getAsInt()));
    }
    if (json.has("commentLines") && json.get("commentLines").isJsonArray()) {
      json
        .getAsJsonArray("commentLines")
        .forEach(value -> builder.addCommentLines(value.getAsInt()));
    }
    if (json.has("nosonarLines") && json.get("nosonarLines").isJsonArray()) {
      json
        .getAsJsonArray("nosonarLines")
        .forEach(value -> builder.addNosonarLines(value.getAsInt()));
    }
    if (json.has("executableLines") && json.get("executableLines").isJsonArray()) {
      json
        .getAsJsonArray("executableLines")
        .forEach(value -> builder.addExecutableLines(value.getAsInt()));
    }
    if (json.has("functions") && !json.get("functions").isJsonNull()) {
      builder.setFunctions(json.get("functions").getAsInt());
    }
    if (json.has("statements") && !json.get("statements").isJsonNull()) {
      builder.setStatements(json.get("statements").getAsInt());
    }
    if (json.has("classes") && !json.get("classes").isJsonNull()) {
      builder.setClasses(json.get("classes").getAsInt());
    }
    if (json.has("complexity") && !json.get("complexity").isJsonNull()) {
      builder.setComplexity(json.get("complexity").getAsInt());
    }
    if (json.has("cognitiveComplexity") && !json.get("cognitiveComplexity").isJsonNull()) {
      builder.setCognitiveComplexity(json.get("cognitiveComplexity").getAsInt());
    }
    return builder.build();
  }

  private static AnalysisLanguage parseAnalysisLanguage(JsonElement value) {
    if (value == null || value.isJsonNull()) {
      return AnalysisLanguage.ANALYSIS_LANGUAGE_UNSPECIFIED;
    }
    var language = value.getAsString();
    return switch (language) {
      case "js", "ANALYSIS_LANGUAGE_JS" -> AnalysisLanguage.ANALYSIS_LANGUAGE_JS;
      case "ts", "ANALYSIS_LANGUAGE_TS" -> AnalysisLanguage.ANALYSIS_LANGUAGE_TS;
      case "css", "ANALYSIS_LANGUAGE_CSS" -> AnalysisLanguage.ANALYSIS_LANGUAGE_CSS;
      default -> AnalysisLanguage.ANALYSIS_LANGUAGE_UNSPECIFIED;
    };
  }

  private static ParsingErrorCode parseParsingErrorCode(JsonElement value) {
    if (value == null || value.isJsonNull()) {
      return ParsingErrorCode.PARSING_ERROR_CODE_UNSPECIFIED;
    }
    var code = value.getAsString();
    return switch (code) {
      case
        "Parsing",
        "PARSING",
        "PARSING_ERROR_CODE_PARSING" -> ParsingErrorCode.PARSING_ERROR_CODE_PARSING;
      case
        "FailingTypeScript",
        "FAILING_TYPESCRIPT",
        "PARSING_ERROR_CODE_FAILING_TYPESCRIPT" -> ParsingErrorCode.PARSING_ERROR_CODE_FAILING_TYPESCRIPT;
      case
        "LinterInitialization",
        "LINTER_INITIALIZATION",
        "PARSING_ERROR_CODE_LINTER_INITIALIZATION" -> ParsingErrorCode.PARSING_ERROR_CODE_LINTER_INITIALIZATION;
      default -> ParsingErrorCode.PARSING_ERROR_CODE_UNSPECIFIED;
    };
  }

  private static TextType parseTextType(JsonElement value) {
    if (value == null || value.isJsonNull()) {
      return TextType.TEXT_TYPE_UNSPECIFIED;
    }
    var textType = value.getAsString();
    return switch (textType) {
      case "KEYWORD", "TEXT_TYPE_KEYWORD" -> TextType.TEXT_TYPE_KEYWORD;
      case "CONSTANT", "TEXT_TYPE_CONSTANT" -> TextType.TEXT_TYPE_CONSTANT;
      case "COMMENT", "TEXT_TYPE_COMMENT" -> TextType.TEXT_TYPE_COMMENT;
      case
        "STRUCTURED_COMMENT",
        "TEXT_TYPE_STRUCTURED_COMMENT" -> TextType.TEXT_TYPE_STRUCTURED_COMMENT;
      case "STRING", "TEXT_TYPE_STRING" -> TextType.TEXT_TYPE_STRING;
      default -> TextType.TEXT_TYPE_UNSPECIFIED;
    };
  }

  private static int optionalInt(JsonElement value) {
    return (value == null || value.isJsonNull()) ? 0 : value.getAsInt();
  }

  private static String optionalString(JsonElement value) {
    return (value == null || value.isJsonNull()) ? "" : value.getAsString();
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
          .build()
      );
      builder.addRule(
        new NewActiveRule.Builder()
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
