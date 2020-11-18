/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.batch.sensor.issue.IssueLocation;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.internal.JUnitTempFolder;
import org.sonar.api.utils.log.LogAndArguments;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.TypeScriptChecks;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.ParsingErrorCode;

import static java.util.Collections.emptyList;
import static java.util.Collections.singleton;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class TypeScriptSensorTest {

  private static final String ESLINT_BASED_RULE = "S3923";

  @Rule
  public LogTester logTester = new LogTester();

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  @Mock
  private EslintBridgeServerImpl eslintBridgeServerMock;

  @Mock
  private AnalysisWarnings analysisWarningsMock;

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  private SensorContextTester context;

  @Before
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);

    when(eslintBridgeServerMock.isAlive()).thenReturn(true);
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(new AnalysisResponse());
    when(eslintBridgeServerMock.getCommandInfo()).thenReturn("eslintBridgeServerMock command info");
    when(eslintBridgeServerMock.loadTsConfig(any())).thenAnswer(
      invocationOnMock -> {
        String tsConfigPath = (String) invocationOnMock.getArguments()[0];
        FilePredicates predicates = context.fileSystem().predicates();
        List<String> files = StreamSupport.stream(context.fileSystem().inputFiles(predicates.hasLanguage("ts")).spliterator(), false)
          .map(file -> file.absolutePath())
          .collect(Collectors.toList());
        return new TsConfigFile(tsConfigPath, files, emptyList());
      });


    context = SensorContextTester.create(tempFolder.newDir());

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
  }

  @Test
  public void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("TypeScript analysis");
    assertThat(descriptor.languages()).containsOnly("ts");
    assertThat(descriptor.type()).isEqualTo(Type.MAIN);
  }

  @Test
  public void should_analyse() throws Exception {
    AnalysisResponse expectedResponse = createResponse();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);

    TypeScriptSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    createTSConfigFile(context);

    sensor.execute(context);
    verify(eslintBridgeServerMock, times(1)).initLinter(any(), any());
    assertThat(context.allIssues()).hasSize(expectedResponse.issues.length);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue firstIssue = issues.next();
    Issue secondIssue = issues.next();

    IssueLocation location = firstIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4)));

    location = secondIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Line issue message");
    assertThat(location.textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 9)));

    assertThat(firstIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(secondIssue.ruleKey().rule()).isEqualTo("S3923");

    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0).get(0)).isEqualTo(TypeOfText.KEYWORD);
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1).get(0)).isEqualTo(TypeOfText.CONSTANT);
    assertThat(context.highlightingTypeAt(inputFile.key(), 3, 0)).isEmpty();

    Collection<TextRange> symbols = context.referencesForSymbolAt(inputFile.key(), 1, 3);
    assertThat(symbols).hasSize(1);
    assertThat(symbols.iterator().next()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(2, 1), new DefaultTextPointer(2, 5)));

    assertThat(context.measure(inputFile.key(), CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(inputFile.key(), CoreMetrics.STATEMENTS).value()).isEqualTo(2);
    assertThat(context.measure(inputFile.key(), CoreMetrics.CLASSES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.NCLOC).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMMENT_LINES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMPLEXITY).value()).isEqualTo(4);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COGNITIVE_COMPLEXITY).value()).isEqualTo(5);

    assertThat(context.cpdTokens(inputFile.key())).hasSize(2);
  }

  @Test
  public void should_not_explode_if_no_response() throws Exception {
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenThrow(new IOException("error"));

    TypeScriptSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to get response while analyzing " + inputFile);
    assertThat(context.allIssues()).isEmpty();
  }


  @Test
  public void should_log_and_stop_with_wrong_tsconfig() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.typescript.tsconfigPath", "wrong.json"));
    createInputFile(ctx);
    TypeScriptSensor typeScriptSensor = createSensor();
    typeScriptSensor.execute(ctx);

    verify(eslintBridgeServerMock, never()).analyzeTypeScript(any());

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Provided tsconfig.json path doesn't exist. Path: '" + baseDir.resolve("wrong.json") + "'");
  }

  @Test
  public void should_raise_a_parsing_error() throws IOException {
    when(eslintBridgeServerMock.analyzeTypeScript(any()))
      .thenReturn(new Gson().fromJson("{ parsingError: { line: 3, message: \"Parse error message\", code: \"Parsing\"} }", AnalysisResponse.class));
    createInputFile(context);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange().start().line()).isEqualTo(3);
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to parse file [dir/file.ts] at line 3: Parse error message");
  }

  @Test
  public void should_raise_a_parsing_error_without_line() throws IOException {
    when(eslintBridgeServerMock.analyzeTypeScript(any()))
      .thenReturn(new Gson().fromJson("{ parsingError: { message: \"Parse error message\"} }", AnalysisResponse.class));
    createInputFile(context);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange()).isNull(); // file level issueCheckListTest.testTypeScriptChecks
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to analyze file [dir/file.ts]: Parse error message");
  }

  @Test
  public void should_send_content_on_sonarlint() throws Exception {
    File baseDir = tempFolder.newDir();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    DefaultInputFile file = createInputFile(ctx);
    Files.write(baseDir.toPath().resolve("tsconfig.json"), singleton("{}"));
    when(eslintBridgeServerMock.loadTsConfig(any())).thenReturn(new TsConfigFile("tsconfig.json", singletonList(file.absolutePath()), emptyList()));
    ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent).isEqualTo("if (cond)\n" +
      "doFoo(); \n" +
      "else \n" +
      "doFoo();");

    clearInvocations(eslintBridgeServerMock);
    ctx = SensorContextTester.create(tempFolder.newDir());
    createInputFile(ctx);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent).isNull();
  }

  @Test
  public void should_send_content_when_not_utf8() throws Exception {
    File baseDir = tempFolder.newDir();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    String content = "if (cond)\ndoFoo(); \nelse \ndoFoo();";
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "dir/file.ts")
      .setLanguage("ts")
      .setCharset(StandardCharsets.ISO_8859_1)
      .setContents(content)
      .build();
    ctx.fileSystem().add(inputFile);
    Files.write(baseDir.toPath().resolve("tsconfig.json"), singleton("{}"));
    when(eslintBridgeServerMock.loadTsConfig(any())).thenReturn(new TsConfigFile("tsconfig.json", singletonList(inputFile.absolutePath()), emptyList()));

    ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent).isEqualTo(content);
  }

  @Test
  public void should_abort_when_missing_typescript() throws Exception {
    AnalysisResponse parseError = new AnalysisResponse();
    parseError.parsingError = new EslintBridgeServer.ParsingError();
    parseError.parsingError.message = "Cannot find module 'typescript'";
    parseError.parsingError.code = ParsingErrorCode.MISSING_TYPESCRIPT;
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(parseError);
    createInputFile(context, "dir/file1.ts");
    createInputFile(context, "dir/file2.ts");
    createSensor().execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).containsOnlyOnce("Cannot find module 'typescript'");
    assertThat(logTester.logs(LoggerLevel.ERROR)).doesNotContain("Failed to analyze file [dir/file1.ts]: Cannot find module 'typescript'");
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("TypeScript dependency was not found and it is required for analysis.");
    // assert that analysis was interrupted after first file
    verify(eslintBridgeServerMock, times(1)).analyzeTypeScript(any());
  }

  @Test
  public void should_log_when_failing_typescript() throws Exception {
    AnalysisResponse parseError = new AnalysisResponse();
    parseError.parsingError = new EslintBridgeServer.ParsingError();
    parseError.parsingError.message = "Debug Failure. False expression.";
    parseError.parsingError.code = ParsingErrorCode.FAILING_TYPESCRIPT;
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(parseError);
    createInputFile(context, "dir/file1.ts");
    createInputFile(context, "dir/file2.ts");
    createSensor().execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to analyze file [dir/file1.ts] from TypeScript: Debug Failure. False expression.");
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to analyze file [dir/file2.ts] from TypeScript: Debug Failure. False expression.");
  }

  @Test
  public void should_create_ui_warning_missing_typescript() throws Exception {
    when(eslintBridgeServerMock.loadTsConfig(any())).thenThrow(new MissingTypeScriptException());
    createInputFile(context, "dir/file1.ts");
    createSensor().execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Missing TypeScript dependency");
    verify(analysisWarningsMock).addUnique("JavaScript and/or TypeScript rules were not executed. Missing TypeScript dependency");
  }

  @Test
  public void should_abort_when_unsupported_typescript() throws Exception {
    AnalysisResponse parseError = new AnalysisResponse();
    parseError.parsingError = new EslintBridgeServer.ParsingError();
    parseError.parsingError.message = "You are using version of TypeScript 1.2.3 which is not supported; supported versions >=4.5.6";
    parseError.parsingError.code = ParsingErrorCode.UNSUPPORTED_TYPESCRIPT;
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(parseError);
    createInputFile(context, "dir/file1.ts");
    createInputFile(context, "dir/file2.ts");
    createSensor().execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).containsOnlyOnce(
      "You are using version of TypeScript 1.2.3 which is not supported; supported versions >=4.5.6");
    assertThat(logTester.logs(LoggerLevel.ERROR)).containsOnlyOnce(
      "If it's not possible to upgrade version of TypeScript used by the project, consider installing supported TypeScript version just for the time of analysis");
    assertThat(logTester.logs(LoggerLevel.ERROR)).doesNotContain(
      "Failed to analyze file [dir/file1.ts]: You are using version of TypeScript 1.2.3 which is not supported; supported versions >=4.5.6");
    // assert that analysis was interrupted after first file
    verify(eslintBridgeServerMock, times(1)).analyzeTypeScript(any());
  }

  @Test
  public void should_analyze_by_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/multi-tsconfig");
    SensorContextTester context = SensorContextTester.create(baseDir);
    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "dir1/file.ts");
    DefaultInputFile file2 = inputFileFromResource(context, baseDir, "dir2/file.ts");
    DefaultInputFile file3 = inputFileFromResource(context, baseDir, "dir3/file.ts");
    inputFileFromResource(context, baseDir, "noconfig.ts");

    String tsconfig1 = absolutePath(baseDir, "dir1/tsconfig.json");
    when(eslintBridgeServerMock.loadTsConfig(tsconfig1))
      .thenReturn(new TsConfigFile(tsconfig1, singletonList(file1.absolutePath()), emptyList()));
    String tsconfig2 = absolutePath(baseDir, "dir2/tsconfig.json");
    when(eslintBridgeServerMock.loadTsConfig(tsconfig2))
      .thenReturn(new TsConfigFile(tsconfig2, singletonList(file2.absolutePath()), emptyList()));
    String tsconfig3 = absolutePath(baseDir, "dir3/tsconfig.json");
    when(eslintBridgeServerMock.loadTsConfig(tsconfig3))
      .thenReturn(new TsConfigFile(tsconfig3, singletonList(file3.absolutePath()), emptyList()));

    ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
    createSensor().execute(context);
    verify(eslintBridgeServerMock, times(3)).analyzeTypeScript(captor.capture());
    assertThat(captor.getAllValues()).extracting(req -> req.filePath).containsExactlyInAnyOrder(
      file1.absolutePath(),
      file2.absolutePath(),
      file3.absolutePath()
    );
    verify(eslintBridgeServerMock, times(3)).newTsConfig();
  }

  @Test
  public void should_resolve_project_references_from_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/solution-tsconfig");
    SensorContextTester context = SensorContextTester.create(baseDir);
    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "src/file.ts");

    String tsconfig = absolutePath(baseDir, "tsconfig.json");
    String appTsConfig = "src/tsconfig.app.json";
    String appTsConfig2 = "src/tsconfig.app2.json";

    // we intentionally create cycle between appTsConfig and appTsConfig2
    when(eslintBridgeServerMock.loadTsConfig(anyString()))
      .thenReturn(
        new TsConfigFile(tsconfig, emptyList(), singletonList(appTsConfig)),
        new TsConfigFile(appTsConfig, singletonList(file1.absolutePath()), singletonList(appTsConfig2)),
        new TsConfigFile(appTsConfig2, singletonList(file1.absolutePath()), singletonList(appTsConfig))
      );

    ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
    createSensor().execute(context);

    verify(eslintBridgeServerMock, times(3)).loadTsConfig(anyString());
    verify(eslintBridgeServerMock, times(1)).analyzeTypeScript(captor.capture());
    assertThat(captor.getAllValues()).extracting(req -> req.filePath).containsExactlyInAnyOrder(
      file1.absolutePath()
    );
  }

  private String absolutePath(Path baseDir, String relativePath) {
    return new File(baseDir.toFile(), relativePath).getAbsolutePath();
  }

  private DefaultInputFile inputFileFromResource(SensorContextTester context, Path baseDir, String file) throws IOException {
    Path filePath = baseDir.resolve(file);
    DefaultInputFile inputFile = new TestInputFileBuilder("projectKey", baseDir.toFile(), filePath.toFile())
      .setContents(new String(Files.readAllBytes(filePath), StandardCharsets.UTF_8))
      .setLanguage("ts")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  @Test
  public void should_stop_without_tsconfig() {
    SensorContextTester context = SensorContextTester.create(tempFolder.newDir());
    context.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    createSensor().execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("No tsconfig.json file found, analysis will be stopped.");
  }

  @Test
  public void should_fail_fast() throws Exception {
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenThrow(new IOException("error"));
    TypeScriptSensor sensor = createSensor();
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    createInputFile(context);

    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis failed (\"sonar.internal.analysis.failFast\"=true)");
  }

  @Test
  public void should_fail_fast_with_parsing_error_without_line() throws IOException {
    when(eslintBridgeServerMock.analyzeTypeScript(any()))
      .thenReturn(new Gson().fromJson("{ parsingError: { message: \"Parse error message\"} }", AnalysisResponse.class));
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    createInputFile(context);
    assertThatThrownBy(() -> createSensor().execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis failed (\"sonar.internal.analysis.failFast\"=true)");
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to analyze file [dir/file.ts]: Parse error message");
  }

  @Test
  public void stop_analysis_if_server_is_not_responding() throws Exception {
    when(eslintBridgeServerMock.isAlive()).thenReturn(false);
    TypeScriptSensor sensor = createSensor();
    createInputFile(context);
    sensor.execute(context);
    final LogAndArguments logAndArguments = logTester.getLogs(LoggerLevel.ERROR).get(0);
    assertThat(logAndArguments.getFormattedMsg()).isEqualTo("Failure during analysis, eslintBridgeServerMock command info");
    assertThat(((IllegalStateException) logAndArguments.getArgs().get()[0]).getMessage()).isEqualTo("eslint-bridge server is not answering");
  }

  @Test
  public void stop_analysis_if_cancelled() throws Exception {
    TypeScriptSensor sensor = createSensor();
    createInputFile(context);
    context.setCancelled(true);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.INFO)).contains("org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state");
  }

  @Test
  public void test_sonarlint_constructor() {
    TypeScriptSensor typeScriptSensor = new TypeScriptSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      new NoSonarFilter(),
      fileLinesContextFactory,
      eslintBridgeServerMock,
      tempFolder);
    assertThat(typeScriptSensor.getAnalysisWarnings()).isNull();
  }

  private TypeScriptSensor createSensor() {
    return new TypeScriptSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      new NoSonarFilter(),
      fileLinesContextFactory,
      eslintBridgeServerMock,
      analysisWarningsMock,
      tempFolder);
  }

  private AnalysisResponse createResponse() {
    return new Gson().fromJson(
      "{" + createIssues() + ","
        + createHighlights() + ","
        + createMetrics() + ","
        + createCpdTokens() + ","
        + createHighlightedSymbols() + "}"
      , AnalysisResponse.class);
  }

  private String createIssues() {
    return "issues: [{"
      + "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []},"
      + "{\"line\":1,\"column\":1,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Line issue message\", \"secondaryLocations\": []"
      + "}]";
  }

  private String createHighlights() {
    return "highlights: ["
      + "{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"textType\":\"KEYWORD\"},"
      + "{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"textType\":\"CONSTANT\"}"
      + "]";
  }

  private String createHighlightedSymbols() {
    return "highlightedSymbols: [{"
      + "\"declaration\": {\"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},"
      + "\"references\": [{\"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5}]"
      + "}]";
  }

  private String createMetrics() {
    return "metrics: {"
      + "\"ncloc\":[1, 2, 3],"
      + "\"commentLines\":[4, 5, 6],"
      + "\"nosonarLines\":[7, 8, 9],"
      + "\"executableLines\":[10, 11, 12],"
      + "\"functions\":1,"
      + "\"statements\":2,"
      + "\"classes\":3,"
      + "\"complexity\":4,"
      + "\"cognitiveComplexity\":5"
      + "}";
  }

  private String createCpdTokens() {
    return "cpdTokens: ["
      + "{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"image\":\"LITERAL\"},"
      + "{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"image\":\"if\"}"
      + "]";
  }

  private static DefaultInputFile createInputFile(SensorContextTester context) {
    return createInputFile(context, "dir/file.ts");
  }

  private static DefaultInputFile createInputFile(SensorContextTester context, String relativePath) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setLanguage("ts")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private static void createTSConfigFile(SensorContextTester context) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "tsconfig.json")
      .setContents("{\"compilerOptions\": {\"target\": \"es6\", \"allowJs\": true }}")
      .build();
    context.fileSystem().add(inputFile);
  }

  private static TypeScriptChecks checks(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(CheckList.TS_REPOSITORY_KEY, ruleKey)).build());
    }
    return new TypeScriptChecks(new CheckFactory(builder.build()));
  }
}
