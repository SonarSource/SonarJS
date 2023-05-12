/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.eslint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Iterator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
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
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogAndArguments;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.TestUtils;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.eslint.cache.CacheTestUtils;

class JsTsSensorTest {

  private static final String ESLINT_BASED_RULE = "S3923";

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @TempDir
  Path baseDir;

  @Mock
  private EslintBridgeServerImpl eslintBridgeServerMock;

  private final TestAnalysisWarnings analysisWarnings = new TestAnalysisWarnings();

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  private SensorContextTester context;

  @TempDir
  Path tempDir;

  TempFolder tempFolder;

  @TempDir
  Path workDir;

  private Monitoring monitoring;
  private AnalysisProcessor processAnalysis;

  @BeforeEach
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);

    // reset is required as this static value might be set by another test
    PluginInfo.setUcfgPluginVersion(null);
    tempFolder = new DefaultTempFolder(tempDir.toFile(), true);
    when(eslintBridgeServerMock.isAlive()).thenReturn(true);
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    when(eslintBridgeServerMock.getCommandInfo()).thenReturn("eslintBridgeServerMock command info");
    context = createSensorContext(baseDir);
    context.setPreviousCache(mock(ReadCache.class));
    context.setNextCache(mock(WriteCache.class));

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
    monitoring = new Monitoring(new MapSettings().asConfig());
    processAnalysis =
      new AnalysisProcessor(new DefaultNoSonarFilter(), fileLinesContextFactory, monitoring);
  }

  @Test
  void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("JavaScript/TypeScript analysis");
    assertThat(descriptor.languages()).containsOnly("js", "ts");
  }

  @Test
  void should_analyse() throws Exception {
    AnalysisResponse expectedResponse = createResponse();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);

    JsTsSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    createVueInputFile();

    sensor.execute(context);
    verify(eslintBridgeServerMock, times(1)).initLinter(any(), any(), any(), any());
    assertThat(context.allIssues()).hasSize(expectedResponse.issues.size());

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue firstIssue = issues.next();
    Issue secondIssue = issues.next();

    IssueLocation location = firstIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange())
      .isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4)));

    location = secondIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Line issue message");
    assertThat(location.textRange())
      .isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 9)));

    assertThat(firstIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(secondIssue.ruleKey().rule()).isEqualTo("S3923");

    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0).get(0))
      .isEqualTo(TypeOfText.KEYWORD);
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1).get(0))
      .isEqualTo(TypeOfText.CONSTANT);
    assertThat(context.highlightingTypeAt(inputFile.key(), 3, 0)).isEmpty();

    Collection<TextRange> symbols = context.referencesForSymbolAt(inputFile.key(), 1, 3);
    assertThat(symbols).hasSize(1);
    assertThat(symbols.iterator().next())
      .isEqualTo(new DefaultTextRange(new DefaultTextPointer(2, 1), new DefaultTextPointer(2, 5)));

    assertThat(context.measure(inputFile.key(), CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(inputFile.key(), CoreMetrics.STATEMENTS).value()).isEqualTo(2);
    assertThat(context.measure(inputFile.key(), CoreMetrics.CLASSES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.NCLOC).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMMENT_LINES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMPLEXITY).value()).isEqualTo(4);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COGNITIVE_COMPLEXITY).value())
      .isEqualTo(5);

    assertThat(context.cpdTokens(inputFile.key())).hasSize(2);
  }

  @Test
  void should_not_explode_if_no_response() throws Exception {
    createVueInputFile();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenThrow(new IOException("error"));

    JsTsSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to get response while analyzing " + inputFile.uri());
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
    when(eslintBridgeServerMock.analyzeTypeScript(any()))
      .thenReturn(
        new Gson()
          .fromJson(
            "{ parsingError: { line: 3, message: \"Parse error message\", code: \"Parsing\"} }",
            AnalysisResponse.class
          )
      );
    createInputFile(context);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange().start().line()).isEqualTo(3);
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to parse file [dir/file.ts] at line 3: Parse error message");
  }

  @Test
  void should_raise_a_parsing_error_without_line() throws IOException {
    createVueInputFile();
    when(eslintBridgeServerMock.analyzeTypeScript(any()))
      .thenReturn(
        new Gson()
          .fromJson("{ parsingError: { message: \"Parse error message\"} }", AnalysisResponse.class)
      );
    createInputFile(context);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(2);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange()).isNull(); // file level issueCheckListTest.testTypeScriptChecks
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(2);
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains(
        "Failed to analyze file [dir/file.ts]: Parse error message",
        "Failed to analyze file [file.vue]: Parse error message"
      );
  }

  @Test
  void should_send_content_on_sonarlint() throws Exception {
    SensorContextTester ctx = createSensorContext(baseDir);
    setSonarLintRuntime(ctx);
    createInputFile(ctx);
    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent)
      .isEqualTo("if (cond)\n" + "doFoo(); \n" + "else \n" + "doFoo();");
  }

  @Test
  void should_not_send_content() throws Exception {
    var ctx = createSensorContext(baseDir);
    createInputFile(ctx);
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    createSensor().execute(ctx);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(eslintBridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent).isNull();
  }

  @Test
  void should_send_content_when_not_utf8() throws Exception {
    SensorContextTester ctx = createSensorContext(baseDir);
    createVueInputFile(ctx);
    String content = "if (cond)\ndoFoo(); \nelse \ndoFoo();";
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "dir/file.ts")
      .setLanguage("ts")
      .setCharset(StandardCharsets.ISO_8859_1)
      .setContents(content)
      .build();
    ctx.fileSystem().add(inputFile);

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock, times(2)).analyzeTypeScript(captor.capture());
    assertThat(captor.getAllValues()).extracting(c -> c.fileContent).contains(content);
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
    DefaultInputFile inputFile = new TestInputFileBuilder(
      "projectKey",
      baseDir.toFile(),
      filePath.toFile()
    )
      .setContents(Files.readString(filePath))
      .setCharset(StandardCharsets.UTF_8)
      .setLanguage("ts")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  @Test
  void should_stop_when_no_input_files() throws Exception {
    SensorContextTester context = createSensorContext(tempDir);
    createSensor().execute(context);
    assertThat(logTester.logs())
      .contains(
        "No input files found for analysis",
        "Hit the cache for 0 out of 0",
        "Miss the cache for 0 out of 0"
      );
  }

  @Test
  void should_fail_fast() throws Exception {
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenThrow(new IOException("error"));
    JsTsSensor sensor = createSensor();
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    createInputFile(context);

    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis failed (\"sonar.internal.analysis.failFast\"=true)");
  }

  @Test
  void should_fail_fast_with_parsing_error_without_line() throws IOException {
    createVueInputFile();
    when(eslintBridgeServerMock.analyzeTypeScript(any()))
      .thenReturn(
        new Gson()
          .fromJson("{ parsingError: { message: \"Parse error message\"} }", AnalysisResponse.class)
      );
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    createInputFile(context);
    assertThatThrownBy(() -> createSensor().execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis failed (\"sonar.internal.analysis.failFast\"=true)");
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to analyze file [dir/file.ts]: Parse error message");
  }

  @Test
  void stop_analysis_if_server_is_not_responding() throws Exception {
    when(eslintBridgeServerMock.isAlive()).thenReturn(false);
    JsTsSensor sensor = createSensor();
    createVueInputFile();
    createInputFile(context);
    sensor.execute(context);
    final LogAndArguments logAndArguments = logTester.getLogs(LoggerLevel.ERROR).get(0);
    assertThat(logAndArguments.getFormattedMsg())
      .isEqualTo("Failure during analysis, eslintBridgeServerMock command info");
    assertThat(((IllegalStateException) logAndArguments.getArgs().get()[0]).getMessage())
      .isEqualTo("eslint-bridge server is not answering");
  }

  @Test
  void stop_analysis_if_cancelled() throws Exception {
    JsTsSensor sensor = createSensor();
    createInputFile(context);
    setSonarLintRuntime(context);
    context.setCancelled(true);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.INFO))
      .contains(
        "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
      );
  }

  @Test
  void log_debug_analyzed_filename_with_tsconfig() throws Exception {
    AnalysisResponse expectedResponse = createResponse();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);
    JsTsSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    // having a vue file makes TypeScriptSensor#shouldAnalyzeWithProgram() return false, which leads to the path that executes TypeScript#analyze()
    createVueInputFile();

    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Analyzing file: " + inputFile.uri());
  }

  @Test
  void should_save_cached_cpd() throws IOException {
    var path = "dir/file.ts";
    var context = CacheTestUtils.createContextWithCache(baseDir, workDir, path);
    var file = TestUtils
      .createInputFile(context, "if (cond)\ndoFoo(); \nelse \ndoFoo();", path)
      .setStatus(InputFile.Status.SAME);
    var sensor = createSensor();

    createVueInputFile(context);

    sensor.execute(context);

    assertThat(context.cpdTokens(file.key())).hasSize(2);
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains("Processing cache analysis of file: " + file.uri());
  }

  @Test
  void should_save_cached_cpd_with_program() throws IOException {
    var path = "dir/file.ts";
    var context = CacheTestUtils.createContextWithCache(baseDir, workDir, path);
    var file = TestUtils
      .createInputFile(context, "if (cond)\ndoFoo(); \nelse \ndoFoo();", path)
      .setStatus(InputFile.Status.SAME);
    var sensor = createSensor();

    sensor.execute(context);

    assertThat(context.cpdTokens(file.key())).hasSize(2);
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains("Processing cache analysis of file: " + file.uri());
  }

  private JsTsSensor createSensor() {
    return new JsTsSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      eslintBridgeServerMock,
      analysisWarnings,
      monitoring,
      processAnalysis
    );
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
      "issues: [{" +
      "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []}," +
      "{\"line\":1,\"column\":1,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Line issue message\", \"secondaryLocations\": []" +
      "}]"
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
    DefaultInputFile inputFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve(relativePath).toFile()
    )
      .setLanguage("ts")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private void createVueInputFile() {
    createVueInputFile(context);
  }

  private void createVueInputFile(SensorContextTester context) {
    var vueFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("file.vue").toFile()
    )
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("<script lang=\"ts\"></script>")
      .build();
    context.fileSystem().add(vueFile);
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
