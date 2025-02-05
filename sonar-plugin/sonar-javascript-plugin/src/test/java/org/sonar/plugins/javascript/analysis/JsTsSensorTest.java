/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import static java.util.Collections.emptyList;
import static java.util.Collections.singleton;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.TestUtils.createInputFile;

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.provider.Arguments;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.slf4j.event.Level;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
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
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TestUtils;
import org.sonar.plugins.javascript.analysis.cache.CacheTestUtils;
import org.sonar.plugins.javascript.api.JsAnalysisConsumer;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.bridge.BridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.bridge.BridgeServer.ParsingError;
import org.sonar.plugins.javascript.bridge.BridgeServer.ParsingErrorCode;
import org.sonar.plugins.javascript.bridge.BridgeServer.TsProgram;
import org.sonar.plugins.javascript.bridge.BridgeServer.TsProgramRequest;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.PluginInfo;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.bridge.protobuf.NodeType;
import org.sonar.plugins.javascript.bridge.protobuf.Position;
import org.sonar.plugins.javascript.bridge.protobuf.Program;
import org.sonar.plugins.javascript.bridge.protobuf.SourceLocation;
import org.sonar.plugins.javascript.sonarlint.TsConfigCache;
import org.sonar.plugins.javascript.sonarlint.TsConfigCacheImpl;

class JsTsSensorTest {

  private static final String ESLINT_BASED_RULE = "S3923";
  public static final String PLUGIN_VERSION = "1.0";

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @TempDir
  Path baseDir;

  @Mock
  private BridgeServerImpl bridgeServerMock;

  private TsConfigCache tsConfigCache;

  private final TestAnalysisWarnings analysisWarnings = new TestAnalysisWarnings();

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  private SensorContextTester context;

  @TempDir
  Path tempDir;

  TempFolder tempFolder;

  @TempDir
  Path workDir;

  private AnalysisProcessor processAnalysis;

  @BeforeEach
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);

    // reset is required as this static value might be set by another test
    PluginInfo.setUcfgPluginVersion(null);
    // this is required to avoid the test to use real plugin version from the manifest
    PluginInfo.setVersion(PLUGIN_VERSION);
    tempFolder = new DefaultTempFolder(tempDir.toFile(), true);
    when(bridgeServerMock.isAlive()).thenReturn(true);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    when(bridgeServerMock.getCommandInfo()).thenReturn("bridgeServerMock command info");
    when(bridgeServerMock.getTelemetry()).thenReturn(
      new BridgeServer.TelemetryData(
        List.of(),
        new BridgeServer.RuntimeTelemetry(Version.create(22, 9), "host")
      )
    );
    when(bridgeServerMock.loadTsConfig(any())).thenAnswer(invocationOnMock -> {
      String tsConfigPath = (String) invocationOnMock.getArguments()[0];
      FilePredicates predicates = context.fileSystem().predicates();
      List<String> files = StreamSupport.stream(
        context.fileSystem().inputFiles(predicates.hasLanguage("ts")).spliterator(),
        false
      )
        .map(file -> file.absolutePath())
        .collect(Collectors.toList());
      return new TsConfigFile(tsConfigPath, files, emptyList());
    });
    when(bridgeServerMock.createTsConfigFile(any())).thenReturn(
      new TsConfigFile(tempFolder.newFile().getAbsolutePath(), emptyList(), emptyList())
    );

    context = createSensorContext(baseDir);
    context.setPreviousCache(mock(ReadCache.class));
    context.setNextCache(mock(WriteCache.class));

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
    processAnalysis = new AnalysisProcessor(new DefaultNoSonarFilter(), fileLinesContextFactory);
    tsConfigCache = new TsConfigCacheImpl(bridgeServerMock);
  }

  @Test
  void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("JavaScript/TypeScript analysis");
    assertThat(descriptor.languages()).containsOnly("js", "ts");
  }

  @Test
  void should_de_duplicate_issues() throws Exception {
    JsTsSensor sensor = createSensor();

    Path baseDir = Paths.get("src/test/resources/de-duplicate-issues");

    var context = createSensorContext(baseDir);

    context.settings().setProperty(JavaScriptPlugin.ESLINT_REPORT_PATHS, "eslint-report.json");

    var content =
      "function addOne(i) {\n" +
      "    if (i != NaN) {\n" +
      "        return i ++\n" +
      "    } else {\n" +
      "      return\n" +
      "    }\n" +
      "};";

    var inputFile = createInputFile(
      context,
      "file.js",
      StandardCharsets.ISO_8859_1,
      baseDir,
      content
    );

    var program = new TsProgram("1", List.of(inputFile.absolutePath()), List.of(), false, null);
    var issueFilePath = Path.of(baseDir.toString(), "file.js").toAbsolutePath().toString();

    AnalysisResponse expectedResponse = createResponse(
      List.of(
        new BridgeServer.Issue(
          1,
          1,
          2,
          1,
          "foo",
          "S3923",
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
          List.of(),
          1.0,
          List.of(),
          List.of("use-isnan"),
          issueFilePath
        )
      )
    );

    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);
    when(bridgeServerMock.createProgram(any())).thenReturn(program);

    sensor.execute(context);

    var issues = context.allIssues();
    var externalIssues = context.allExternalIssues();

    assertThat(issues).hasSize(2);
    assertThat(externalIssues).hasSize(2);
  }

  @Test
  void should_analyse() throws Exception {
    JsTsSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    createTsConfigFile();

    AnalysisResponse expectedResponse = createResponse();
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of(), false, null);
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);

    sensor.execute(context);
    verify(bridgeServerMock, times(1)).initLinter(any(), any(), any(), any(), any(), any());
    assertThat(context.allIssues()).hasSize(expectedResponse.issues().size());
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
  void should_explode_if_no_response() throws Exception {
    createVueInputFile();
    when(bridgeServerMock.analyzeTypeScript(any())).thenThrow(new IllegalStateException("error"));

    var tsProgram = new TsProgram("1", List.of(), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    createTsConfigFile();
    JsTsSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");

    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to get response while analyzing " + inputFile.uri()
    );
    assertThat(context.allIssues()).isEmpty();
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

  @Test
  void should_raise_a_parsing_error() throws IOException {
    setSonarLintRuntime(context);
    createTsConfigFile();
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(
      new Gson()
        .fromJson(
          "{ parsingError: { line: 3, message: \"Parse error message\", code: \"Parsing\"} }",
          AnalysisResponse.class
        )
    );
    createInputFile(context);
    createSonarLintSensor().execute(context);
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
  void should_raise_a_parsing_error_without_line() throws IOException {
    createVueInputFile();
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(
      new Gson()
        .fromJson("{ parsingError: { message: \"Parse error message\"} }", AnalysisResponse.class)
    );
    createInputFile(context);
    var tsProgram = new TsProgram("1", List.of(), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(2);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange()).isNull(); // file level issueCheckListTest.testTypeScriptChecks
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(2);
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file.ts]: Parse error message",
      "Failed to analyze file [file.vue]: Parse error message"
    );
  }

  @Test
  void should_send_content_on_sonarlint() throws Exception {
    SensorContextTester ctx = createSensorContext(baseDir);
    setSonarLintRuntime(ctx);
    DefaultInputFile file = createInputFile(ctx);
    Files.write(baseDir.resolve("tsconfig.json"), singleton("{}"));
    when(bridgeServerMock.loadTsConfig(any())).thenReturn(
      new TsConfigFile("tsconfig.json", singletonList(file.absolutePath()), emptyList())
    );
    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSonarLintSensor().execute(ctx);
    verify(bridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent()).isEqualTo(
      "if (cond)\n" + "doFoo(); \n" + "else \n" + "doFoo();"
    );
  }

  @Test
  void should_not_send_content() throws Exception {
    var ctx = createSensorContext(baseDir);
    var inputFile = createInputFile(ctx);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    createTsConfigFile();
    createSensor().execute(ctx);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(bridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent()).isNull();

    var deleteCaptor = ArgumentCaptor.forClass(TsProgram.class);
    verify(bridgeServerMock).deleteProgram(deleteCaptor.capture());
    assertThat(deleteCaptor.getValue().programId()).isEqualTo(tsProgram.programId());
  }

  @Test
  void should_send_skipAst_flag_when_there_are_no_consumers() throws Exception {
    var ctx = createSensorContext(baseDir);
    var inputFile = createInputFile(ctx);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    createSensor().execute(ctx);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(bridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().skipAst()).isTrue();
  }

  @Test
  void should_not_send_the_skipAst_flag_when_there_are_consumers() throws Exception {
    var ctx = createSensorContext(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.jasmin.internal.enabled", "true"));
    var inputFile = createInputFile(ctx);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    var consumer = createConsumer();
    var sensor = createSensorWithConsumer(consumer);
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    sensor.execute(ctx);

    createSensor().execute(context);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(bridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().skipAst()).isFalse();
  }

  @Test
  void should_not_send_the_skipAst_flag_when_jared_is_enabled() throws Exception {
    var ctx = createSensorContext(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.jared.internal.enabled", "true"));
    var inputFile = createInputFile(ctx);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    var consumer = createConsumer();
    var sensor = createSensorWithConsumer(consumer);
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    sensor.execute(ctx);

    createSensor().execute(context);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(bridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().skipAst()).isFalse();
  }

  /**
   * @deprecated Should be removed when the sonar.armor.internal.enabled is removed, see comments in ContextUtils#ARMOR_INTERNAL_ENABLED
   */
  @Deprecated(forRemoval = true)
  @Test
  void should_send_the_skipAst_flag_when_there_are_consumers_but_armor_is_disabled()
    throws Exception {
    var ctx = createSensorContext(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.armor.internal.enabled", "false"));
    var inputFile = createInputFile(ctx);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    var consumer = createConsumer();
    var sensor = createSensorWithConsumer(consumer);
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    sensor.execute(ctx);

    createSensor().execute(context);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(bridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().skipAst()).isTrue();
  }

  @Test
  void should_send_the_skipAst_flag_when_there_are_consumers_but_jasmin_is_disabled()
    throws Exception {
    var ctx = createSensorContext(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.jasmin.internal.enabled", "false"));
    var inputFile = createInputFile(ctx);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    var consumer = createConsumer();
    var sensor = createSensorWithConsumer(consumer);
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    sensor.execute(ctx);

    createSensor().execute(context);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(bridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().skipAst()).isTrue();
  }

  @Test
  void should_send_content_when_not_utf8() throws Exception {
    var ctx = createSensorContext(baseDir);
    createVueInputFile(ctx);
    String content = "if (cond)\ndoFoo(); \nelse \nanotherFoo();";
    DefaultInputFile inputFile = createInputFile(
      ctx,
      "dir/file.ts",
      StandardCharsets.ISO_8859_1,
      baseDir,
      content
    );

    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    createTsConfigFile();

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(ctx);
    verify(bridgeServerMock, times(2)).analyzeTypeScript(captor.capture());
    assertThat(captor.getAllValues()).extracting(c -> c.fileContent()).contains(content);
  }

  @Test
  void should_log_when_failing_typescript() throws Exception {
    var err = new ParsingError(
      "Debug Failure. False expression.",
      null,
      ParsingErrorCode.FAILING_TYPESCRIPT
    );
    var parseError = new AnalysisResponse(err, null, null, null, null, null, null, null);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(parseError);
    var file1 = createInputFile(context, "dir/file1.ts");
    var file2 = createInputFile(context, "dir/file2.ts");
    var tsProgram = new TsProgram(
      "1",
      List.of(file1.absolutePath(), file2.absolutePath()),
      List.of()
    );
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    createVueInputFile();
    createSensor().execute(context);
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file1.ts] from TypeScript: Debug Failure. False expression."
    );
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file2.ts] from TypeScript: Debug Failure. False expression."
    );
  }

  @Test
  void should_analyze_by_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/multi-tsconfig");
    SensorContextTester context = createSensorContext(baseDir);
    setSonarLintRuntime(context);

    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "dir1/file.ts");
    DefaultInputFile file2 = inputFileFromResource(context, baseDir, "dir2/file.ts");
    DefaultInputFile file3 = inputFileFromResource(context, baseDir, "dir3/file.ts");
    var noconfig = inputFileFromResource(context, baseDir, "noconfig.ts");

    String tsconfig1 = absolutePath(baseDir, "dir1/tsconfig.json");
    when(bridgeServerMock.loadTsConfig(tsconfig1)).thenReturn(
      new TsConfigFile(tsconfig1, singletonList(file1.absolutePath()), emptyList())
    );
    String tsconfig2 = absolutePath(baseDir, "dir2/tsconfig.json");
    when(bridgeServerMock.loadTsConfig(tsconfig2)).thenReturn(
      new TsConfigFile(tsconfig2, singletonList(file2.absolutePath()), emptyList())
    );
    String tsconfig3 = absolutePath(baseDir, "dir3/tsconfig.json");
    when(bridgeServerMock.loadTsConfig(tsconfig3)).thenReturn(
      new TsConfigFile(tsconfig3, singletonList(file3.absolutePath()), emptyList())
    );

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSonarLintSensor().execute(context);
    verify(bridgeServerMock, times(4)).analyzeTypeScript(captor.capture());
    assertThat(captor.getAllValues())
      .extracting(req -> req.filePath())
      .containsExactlyInAnyOrder(
        file1.absolutePath(),
        file2.absolutePath(),
        file3.absolutePath(),
        noconfig.absolutePath()
      );
  }

  @Test
  void should_analyze_by_program_on_missing_extended_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/external-tsconfig").toAbsolutePath();
    SensorContextTester context = createSensorContext(baseDir);

    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "src/main.ts");

    String tsconfig = absolutePath(baseDir, "tsconfig.json");

    when(bridgeServerMock.createProgram(any())).thenReturn(
      new TsProgram(
        "1",
        Arrays.asList(file1.absolutePath(), "not/part/sonar/project/file.ts"),
        emptyList(),
        true
      )
    );

    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(context);
    verify(bridgeServerMock, times(1)).analyzeTypeScript(captor.capture());
    assertThat(captor.getAllValues())
      .extracting(req -> req.filePath())
      .containsExactlyInAnyOrder(file1.absolutePath());

    verify(bridgeServerMock, times(1)).deleteProgram(any());
    assertThat(logTester.logs(Level.WARN)).contains(
      "At least one tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details."
    );
    Assertions.assertThat(analysisWarnings.warnings).contains(
      "At least one tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details."
    );
  }

  @Test
  void should_analyze_by_program() throws Exception {
    Path baseDir = Paths.get("src/test/resources/multi-tsconfig").toAbsolutePath();
    SensorContextTester context = createSensorContext(baseDir);

    var file1 = inputFileFromResource(context, baseDir, "dir1/file.ts");
    var file2 = inputFileFromResource(context, baseDir, "dir2/file.ts");
    var file3 = inputFileFromResource(context, baseDir, "dir3/file.ts");
    var noconfig = inputFileFromResource(context, baseDir, "noconfig.ts");

    String tsconfig1 = absolutePath(baseDir, "dir1/tsconfig.json");

    when(bridgeServerMock.createProgram(any())).thenReturn(
      new TsProgram(
        "1",
        Arrays.asList(file1.absolutePath(), "not/part/sonar/project/file.ts"),
        emptyList()
      ),
      new TsProgram(
        "2",
        singletonList(file2.absolutePath()),
        singletonList("some-other-tsconfig.json")
      ),
      new TsProgram("something went wrong"),
      new TsProgram(
        "3",
        Arrays.asList(file2.absolutePath(), file3.absolutePath()),
        singletonList(tsconfig1)
      )
    );

    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    ArgumentCaptor<TsProgramRequest> captorProgram = ArgumentCaptor.forClass(
      TsProgramRequest.class
    );
    createSensor().execute(context);
    verify(bridgeServerMock, times(4)).analyzeTypeScript(captor.capture());
    verify(bridgeServerMock, times(4)).createProgram(captorProgram.capture());
    assertThat(captor.getAllValues())
      .extracting(req -> req.filePath())
      .containsExactlyInAnyOrder(
        file1.absolutePath(),
        file2.absolutePath(),
        file3.absolutePath(),
        noconfig.absolutePath()
      );

    verify(bridgeServerMock, times(3)).deleteProgram(any());

    assertThat(logTester.logs(Level.DEBUG)).contains(
      "File already analyzed: '" +
      file2.absolutePath() +
      "'. Check your project configuration to avoid files being part of multiple projects."
    );
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to create program: something went wrong"
    );

    Assertions.assertThat(analysisWarnings.warnings).contains(
      String.format(
        "Failed to create TypeScript program with TSConfig file %s. Highest TypeScript supported version is %s.",
        captorProgram.getAllValues().get(2).tsConfig(),
        JavaScriptPlugin.TYPESCRIPT_VERSION
      )
    );
  }

  @Test
  void should_not_analyze_references_twice() throws Exception {
    Path baseDir = Paths.get("src/test/resources/referenced-tsconfigs").toAbsolutePath();
    SensorContextTester context = createSensorContext(baseDir);

    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "file.ts");
    DefaultInputFile file2 = inputFileFromResource(context, baseDir, "dir/file.ts");

    String tsconfig1 = absolutePath(baseDir, "tsconfig.json");
    String tsconfig2 = absolutePath(baseDir, "dir/tsconfig.json");

    when(bridgeServerMock.createProgram(any())).thenReturn(
      new TsProgram(
        "1",
        singletonList(file1.absolutePath()),
        singletonList(tsconfig2.replaceAll("[\\\\/]", "/"))
      ),
      new TsProgram(
        "2",
        singletonList(file2.absolutePath()),
        singletonList(tsconfig1.replaceAll("[\\\\/]", "/"))
      )
    );

    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());

    ArgumentCaptor<TsProgramRequest> captorProgram = ArgumentCaptor.forClass(
      TsProgramRequest.class
    );
    createSensor().execute(context);
    verify(bridgeServerMock, times(2)).createProgram(captorProgram.capture());
    assertThat(captorProgram.getAllValues())
      .extracting(TsProgramRequest::tsConfig)
      .isEqualTo(List.of(tsconfig1, tsconfig2));

    verify(bridgeServerMock, times(2)).deleteProgram(any());

    assertThat(logTester.logs(Level.INFO)).containsOnlyOnce(
      "TypeScript configuration file " + tsconfig1
    );
    assertThat(logTester.logs(Level.INFO)).containsOnlyOnce(
      "TypeScript configuration file " + tsconfig2
    );
  }

  // This test will be removed when logic is moved to Node
  @Test
  @Disabled
  void should_do_nothing_when_no_tsconfig_when_analysis_with_program() throws IOException {
    var ctx = createSensorContext(baseDir);
    createInputFile(ctx);
    createSensor().execute(ctx);

    assertThat(logTester.logs(Level.INFO)).contains("No tsconfig.json file found");
    assertThat(logTester.logs(Level.INFO)).contains(
      "Skipped 1 file(s) because they were not part of any tsconfig.json (enable debug logs to see the full list)"
    );
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "File not part of any tsconfig.json: dir/file.ts"
    );
  }

  private static Stream<Arguments> provideAnalyzeByTsConfig() {
    return Stream.of(
      Arguments.of(true, 2), // SonarLint = true, 2 invocations
      Arguments.of(false, 3) // SonarLint = false, 3 invocations
    );
  }

  @Test
  void should_resolve_project_references_from_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/solution-tsconfig");
    SensorContextTester context = createSensorContext(baseDir);
    setSonarLintRuntime(context);
    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "src/file.ts");

    String tsconfig = absolutePath(baseDir, "tsconfig.json");
    String appTsConfig = absolutePath(baseDir, "src/tsconfig.app.json");
    String appTsConfig2 = absolutePath(baseDir, "src/tsconfig.app2.json");

    // we intentionally create cycle between appTsConfig and appTsConfig2
    when(bridgeServerMock.loadTsConfig(anyString())).thenReturn(
      new TsConfigFile(tsconfig, emptyList(), singletonList(appTsConfig)),
      new TsConfigFile(
        appTsConfig,
        singletonList(file1.absolutePath()),
        singletonList(appTsConfig2)
      ),
      new TsConfigFile(
        appTsConfig2,
        singletonList(file1.absolutePath()),
        singletonList(appTsConfig)
      )
    );

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSonarLintSensor().execute(context);

    // Only 2 calls, as we already find the necessary tsconfig (src/tsconfig.app.json) on the 2nd call
    verify(bridgeServerMock, times(2)).loadTsConfig(anyString());
    verify(bridgeServerMock, times(1)).analyzeTypeScript(captor.capture());
    assertThat(captor.getAllValues())
      .extracting(req -> req.filePath())
      .containsExactlyInAnyOrder(file1.absolutePath());
  }

  @Test
  void should_stop_when_no_input_files() throws Exception {
    SensorContextTester context = createSensorContext(tempDir);
    createSensor().execute(context);
    assertThat(logTester.logs()).contains(
      "No input files found for analysis",
      "Hit the cache for 0 out of 0",
      "Miss the cache for 0 out of 0"
    );
  }

  @Test
  void should_fail_fast() throws Exception {
    createTsConfigFile();
    when(bridgeServerMock.analyzeTypeScript(any())).thenThrow(new IllegalStateException("error"));
    JsTsSensor sensor = createSensor();
    createInputFile(context);

    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");
  }

  @Test
  void should_fail_fast_with_parsing_error_without_line() throws IOException {
    createVueInputFile();
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(
      new Gson()
        .fromJson("{ parsingError: { message: \"Parse error message\"} }", AnalysisResponse.class)
    );
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    createInputFile(context);
    var tsProgram = new TsProgram("1", List.of(), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    assertThatThrownBy(() -> createSensor().execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis of JS/TS files failed");
    assertThat(logTester.logs(Level.ERROR)).contains(
      "Failed to analyze file [dir/file.ts]: Parse error message"
    );
  }

  @Test
  void stop_analysis_if_cancelled() throws Exception {
    JsTsSensor sensor = createSonarLintSensor();
    createInputFile(context);
    setSonarLintRuntime(context);
    createTsConfigFile();
    context.setCancelled(true);
    sensor.execute(context);
    assertThat(logTester.logs(Level.INFO)).contains(
      "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
    );
  }

  @Test
  void log_debug_analyzed_filename_with_program() throws Exception {
    JsTsSensor sensor = createSensor();
    createTsConfigFile();
    DefaultInputFile inputFile = createInputFile(context);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());

    sensor.execute(context);
    assertThat(logTester.logs(Level.DEBUG)).contains("Analyzing file: " + inputFile.uri());
  }

  @Test
  void log_debug_analyzed_filename_with_tsconfig() throws Exception {
    AnalysisResponse expectedResponse = createResponse();
    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);
    var inputFile = createVueInputFile();
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    JsTsSensor sensor = createSensor();
    createTsConfigFile();

    sensor.execute(context);
    assertThat(logTester.logs(Level.DEBUG)).contains("Analyzing file: " + inputFile.uri());
  }

  @Test
  void should_save_cached_cpd() throws IOException {
    var path = "dir/file.ts";
    var context = CacheTestUtils.createContextWithCache(baseDir, workDir, path);
    var file = TestUtils.createInputFile(
      context,
      "if (cond)\ndoFoo(); \nelse \ndoFoo();",
      path
    ).setStatus(InputFile.Status.SAME);
    var sensor = createSensor();

    createVueInputFile(context);
    createTsConfigFile();
    var tsProgram = new TsProgram("1", List.of(file.absolutePath()), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    sensor.execute(context);

    assertThat(context.cpdTokens(file.key())).hasSize(2);
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Processing cache analysis of file: " + file.uri()
    );
  }

  @Test
  void should_save_cached_cpd_with_program() throws IOException {
    var path = "dir/file.ts";
    var context = CacheTestUtils.createContextWithCache(baseDir, workDir, path);
    var file = TestUtils.createInputFile(
      context,
      "if (cond)\ndoFoo(); \nelse \ndoFoo();",
      path
    ).setStatus(InputFile.Status.SAME);
    var sensor = createSensor();

    createTsConfigFile();
    var tsProgram = new TsProgram("1", List.of(file.absolutePath()), List.of());
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);

    sensor.execute(context);

    assertThat(context.cpdTokens(file.key())).hasSize(2);
    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Processing cache analysis of file: " + file.uri()
    );
  }

  @Test
  void should_invoke_analysis_consumers() throws Exception {
    var consumer = new JsAnalysisConsumer() {
      final List<JsFile> files = new ArrayList<>();
      boolean done;

      @Override
      public void accept(JsFile jsFile) {
        files.add(jsFile);
      }

      @Override
      public void doneAnalysis() {
        done = true;
      }
    };

    var sensor = new JsTsSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      bridgeServerMock,
      analysisWithProgram(),
      new AnalysisConsumers(List.of(consumer))
    );

    var inputFile = createInputFile(context);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of(), false, null);
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);

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

    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(
      new AnalysisResponse(
        null,
        List.of(),
        List.of(),
        List.of(),
        new BridgeServer.Metrics(),
        List.of(),
        List.of(),
        placeHolderNode
      )
    );

    sensor.execute(context);
    assertThat(consumer.files).hasSize(1);
    assertThat(consumer.files.get(0).inputFile()).isEqualTo(inputFile);
    assertThat(consumer.done).isTrue();
  }

  @Test
  void should_not_invoke_analysis_consumers_when_cannot_deserialize() throws Exception {
    var inputFile = createInputFile(context);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of(), false, null);
    when(bridgeServerMock.createProgram(any())).thenReturn(tsProgram);

    Node erroneousNode = Node.newBuilder().setType(NodeType.BlockStatementType).build();

    when(bridgeServerMock.analyzeTypeScript(any())).thenReturn(
      new AnalysisResponse(
        null,
        List.of(),
        List.of(),
        List.of(),
        new BridgeServer.Metrics(),
        List.of(),
        List.of(),
        erroneousNode
      )
    );
    var consumer = new JsAnalysisConsumer() {
      final List<JsFile> files = new ArrayList<>();
      boolean done;

      @Override
      public void accept(JsFile jsFile) {
        files.add(jsFile);
      }

      @Override
      public void doneAnalysis() {
        done = true;
      }
    };
    var sensor = createSensorWithConsumer(consumer);
    sensor.execute(context);
    assertThat(consumer.files).isEmpty();
    assertThat(consumer.done).isTrue();

    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Failed to deserialize AST for file: " + inputFile.uri()
    );
  }

  private JsAnalysisConsumer createConsumer() {
    return new JsAnalysisConsumer() {
      final List<JsFile> files = new ArrayList<>();
      boolean done;

      @Override
      public void accept(JsFile jsFile) {
        files.add(jsFile);
      }

      @Override
      public void doneAnalysis() {
        done = true;
      }

      public List<JsFile> getFiles() {
        return this.files;
      }
    };
  }

  private JsTsSensor createSensorWithConsumer(JsAnalysisConsumer consumer) {
    return new JsTsSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      bridgeServerMock,
      analysisWithProgram(),
      new AnalysisConsumers(List.of(consumer))
    );
  }

  private JsTsSensor createSensor() {
    return new JsTsSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      bridgeServerMock,
      analysisWithProgram(),
      new AnalysisConsumers()
    );
  }

  private JsTsSensor createSonarLintSensor() {
    return new JsTsSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      bridgeServerMock,
      analysisWithWatchProgram(),
      new AnalysisConsumers()
    );
  }

  private AnalysisWithProgram analysisWithProgram() {
    return new AnalysisWithProgram(bridgeServerMock, processAnalysis, analysisWarnings);
  }

  private AnalysisWithWatchProgram analysisWithWatchProgram() {
    return new AnalysisWithWatchProgram(
      bridgeServerMock,
      processAnalysis,
      analysisWarnings,
      tsConfigCache
    );
  }

  private AnalysisResponse createResponse(List<BridgeServer.Issue> issues) {
    var analysisResponse = new AnalysisResponse(
      null,
      issues,
      List.of(),
      List.of(),
      new BridgeServer.Metrics(),
      List.of(),
      List.of(),
      null
    );

    return analysisResponse;
  }

  private AnalysisResponse createResponse() {
    return new Gson()
      .fromJson(
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
        AnalysisResponse.class
      );
  }

  private String createIssues() {
    return (
      "issues: [" +
      "{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"S3923\",\"message\":\"Issue message\", \"secondaryLocations\": [], \"ruleESLintKeys\": []}," +
      "{\"line\":1,\"column\":1,\"ruleId\":\"S3923\",\"message\":\"Line issue message\", \"secondaryLocations\": [], \"ruleESLintKeys\": []}" +
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

  private void createTsConfigFile() throws IOException {
    Files.writeString(baseDir.resolve("tsconfig.json"), "{}");
  }

  private DefaultInputFile createVueInputFile() {
    return createVueInputFile(context);
  }

  private DefaultInputFile createVueInputFile(SensorContextTester context) {
    var vueFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("file.vue").toFile()
    )
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("<script lang=\"ts\">\nif (cond)\ndoFoo(); \nelse \ndoFoo();\n</script>")
      .build();
    context.fileSystem().add(vueFile);
    return vueFile;
  }

  private String absolutePath(Path baseDir, String relativePath) {
    return new File(baseDir.toFile(), relativePath).getAbsolutePath();
  }

  private DefaultInputFile inputFileFromResource(
    SensorContextTester context,
    Path baseDir,
    String file
  ) throws IOException {
    Path filePath = baseDir.resolve(file);
    return createInputFile(
      context,
      file,
      StandardCharsets.UTF_8,
      baseDir,
      Files.readString(filePath)
    );
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
    }
    return new JsTsChecks(new CheckFactory(builder.build()));
  }
}
