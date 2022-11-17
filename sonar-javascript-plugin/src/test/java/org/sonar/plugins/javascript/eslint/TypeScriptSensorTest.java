/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import java.util.Arrays;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
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
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogAndArguments;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.ParsingErrorCode;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgramRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgram;

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

class TypeScriptSensorTest {

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


    context = createSensorContext(baseDir);
    context.setPreviousCache(mock(ReadCache.class));
    context.setNextCache(mock(WriteCache.class));

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
    tempFolder = new DefaultTempFolder(tempDir.toFile(), true);
    monitoring = new Monitoring(new MapSettings().asConfig());
    processAnalysis = new AnalysisProcessor(new DefaultNoSonarFilter(), fileLinesContextFactory, monitoring);
  }

  @Test
  void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("TypeScript analysis");
    assertThat(descriptor.languages()).containsOnly("js", "ts");
  }

  @Test
  void should_analyse() throws Exception {
    AnalysisResponse expectedResponse = createResponse();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);

    TypeScriptSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    createVueInputFile();
    createTsConfigFile();

    sensor.execute(context);
    verify(eslintBridgeServerMock, times(1)).initLinter(any(), any(), any(), any());
    assertThat(context.allIssues()).hasSize(expectedResponse.issues.size());

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
  void should_not_explode_if_no_response() throws Exception {
    createVueInputFile();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenThrow(new IOException("error"));

    TypeScriptSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to get response while analyzing " + inputFile);
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
  void should_raise_a_parsing_error_without_line() throws IOException {
    createVueInputFile();
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
  void should_send_content_on_sonarlint() throws Exception {
    SensorContextTester ctx = createSensorContext(baseDir);
    setSonarLintRuntime(ctx);
    DefaultInputFile file = createInputFile(ctx);
    Files.write(baseDir.resolve("tsconfig.json"), singleton("{}"));
    when(eslintBridgeServerMock.loadTsConfig(any())).thenReturn(new TsConfigFile("tsconfig.json", singletonList(file.absolutePath()), emptyList()));
    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent).isEqualTo("if (cond)\n" +
      "doFoo(); \n" +
      "else \n" +
      "doFoo();");
  }

  @Test
  void should_not_send_content() throws Exception {
    var ctx = createSensorContext(baseDir);
    var inputFile = createInputFile(ctx);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    when(eslintBridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(new AnalysisResponse());
    createTsConfigFile();
    createSensor().execute(ctx);
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    verify(eslintBridgeServerMock).analyzeWithProgram(captor.capture());
    assertThat(captor.getValue().fileContent).isNull();

    var deleteCaptor = ArgumentCaptor.forClass(TsProgram.class);
    verify(eslintBridgeServerMock).deleteProgram(deleteCaptor.capture());
    assertThat(deleteCaptor.getValue().programId).isEqualTo(tsProgram.programId);
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
    Files.write(baseDir.resolve("tsconfig.json"), singleton("{}"));
    when(eslintBridgeServerMock.loadTsConfig(any())).thenReturn(new TsConfigFile("tsconfig.json", singletonList(inputFile.absolutePath()), emptyList()));

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeTypeScript(captor.capture());
    assertThat(captor.getValue().fileContent).isEqualTo(content);
  }

  @Test
  void should_log_when_failing_typescript() throws Exception {
    AnalysisResponse parseError = new AnalysisResponse();
    parseError.parsingError = new EslintBridgeServer.ParsingError();
    parseError.parsingError.message = "Debug Failure. False expression.";
    parseError.parsingError.code = ParsingErrorCode.FAILING_TYPESCRIPT;
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(parseError);
    createInputFile(context, "dir/file1.ts");
    createInputFile(context, "dir/file2.ts");
    createVueInputFile();
    createSensor().execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to analyze file [dir/file1.ts] from TypeScript: Debug Failure. False expression.");
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to analyze file [dir/file2.ts] from TypeScript: Debug Failure. False expression.");
  }

  @Test
  void should_analyze_by_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/multi-tsconfig");
    SensorContextTester context = createSensorContext(baseDir);
    setSonarLintRuntime(context);

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

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
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
  void should_analyze_by_program_on_missing_extended_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/external-tsconfig").toAbsolutePath();
    SensorContextTester context = createSensorContext(baseDir);

    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "src/main.ts");

    String tsconfig = absolutePath(baseDir, "tsconfig.json");

    when(eslintBridgeServerMock.createProgram(any()))
      .thenReturn(
        new TsProgram("1", Arrays.asList(file1.absolutePath(), "not/part/sonar/project/file.ts"), emptyList(), true));

    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(new AnalysisResponse());

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(context);
    verify(eslintBridgeServerMock, times(1)).analyzeWithProgram(captor.capture());
    assertThat(captor.getAllValues()).extracting(req -> req.filePath).containsExactlyInAnyOrder(
      file1.absolutePath()
    );

    verify(eslintBridgeServerMock, times(1)).deleteProgram(any());
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("At least one tsconfig was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.");
    assertThat(analysisWarnings.warnings).contains("At least one tsconfig was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.");
  }

  @Test
  void should_analyze_by_program() throws Exception {
    Path baseDir = Paths.get("src/test/resources/multi-tsconfig").toAbsolutePath();
    SensorContextTester context = createSensorContext(baseDir);

    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "dir1/file.ts");
    DefaultInputFile file2 = inputFileFromResource(context, baseDir, "dir2/file.ts");
    DefaultInputFile file3 = inputFileFromResource(context, baseDir, "dir3/file.ts");
    inputFileFromResource(context, baseDir, "noconfig.ts");

    String tsconfig1 = absolutePath(baseDir, "dir1/tsconfig.json");

    when(eslintBridgeServerMock.createProgram(any()))
      .thenReturn(
        new TsProgram("1", Arrays.asList(file1.absolutePath(), "not/part/sonar/project/file.ts"), emptyList()),
        new TsProgram("2", singletonList(file2.absolutePath()), singletonList("some-other-tsconfig.json")),
        new TsProgram("something went wrong"),
        new TsProgram("3", Arrays.asList(file2.absolutePath(), file3.absolutePath()), singletonList(tsconfig1)));

    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(new AnalysisResponse());

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(context);
    verify(eslintBridgeServerMock, times(3)).analyzeWithProgram(captor.capture());
    assertThat(captor.getAllValues()).extracting(req -> req.filePath).containsExactlyInAnyOrder(
      file1.absolutePath(),
      file2.absolutePath(),
      file3.absolutePath()
    );

    verify(eslintBridgeServerMock, times(3)).deleteProgram(any());

    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("File already analyzed: '" + file2.absolutePath() +
      "'. Check your project configuration to avoid files being part of multiple projects.");
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to create program: something went wrong");
  }

  @Test
  void should_not_analyze_references_twice() throws Exception {
    Path baseDir = Paths.get("src/test/resources/referenced-tsconfigs").toAbsolutePath();
    SensorContextTester context = createSensorContext(baseDir);

    DefaultInputFile file1 = inputFileFromResource(context, baseDir, "file.ts");
    DefaultInputFile file2 = inputFileFromResource(context, baseDir, "dir/file.ts");

    String tsconfig1 = absolutePath(baseDir, "tsconfig.json");
    String tsconfig2 = absolutePath(baseDir, "dir/tsconfig.json");

    when(eslintBridgeServerMock.createProgram(any()))
      .thenReturn(
        new TsProgram("1", singletonList(file1.absolutePath()), singletonList(tsconfig2.replaceAll("[\\\\/]", "/"))),
        new TsProgram("2", singletonList(file2.absolutePath()), singletonList(tsconfig1.replaceAll("[\\\\/]", "\\\\"))));

    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(new AnalysisResponse());

    ArgumentCaptor<TsProgramRequest> captorProgram = ArgumentCaptor.forClass(TsProgramRequest.class);
    createSensor().execute(context);
    verify(eslintBridgeServerMock, times(2)).createProgram(captorProgram.capture());
    assertThat(captorProgram.getAllValues()).extracting(req -> req.tsConfig).isEqualTo(List.of(
      tsconfig1,
      tsconfig2
    ));

    verify(eslintBridgeServerMock, times(2)).deleteProgram(any());

    assertThat(logTester.logs(LoggerLevel.INFO)).containsOnlyOnce("TypeScript configuration file " + tsconfig1);
    assertThat(logTester.logs(LoggerLevel.INFO)).containsOnlyOnce("TypeScript configuration file " + tsconfig2);
  }

  @Test
  void should_do_nothing_when_no_tsconfig_when_analysis_with_program() throws IOException {
    var ctx = createSensorContext(baseDir);
    createInputFile(ctx);
    createSensor().execute(ctx);

    assertThat(logTester.logs(LoggerLevel.INFO)).contains("No tsconfig.json file found");
    assertThat(logTester.logs(LoggerLevel.INFO)).contains("Skipped 1 file(s) because they were not part of any tsconfig (enable debug logs to see the full list)");
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("File not part of any tsconfig: dir/file.ts");
  }

  @Test
  void should_resolve_project_references_from_tsconfig() throws Exception {
    Path baseDir = Paths.get("src/test/resources/solution-tsconfig");
    SensorContextTester context = createSensorContext(baseDir);
    setSonarLintRuntime(context);
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

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
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
      .setContents(Files.readString(filePath))
      .setLanguage("ts")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  @Test
  void should_stop_when_no_input_files() throws Exception {
    SensorContextTester context = createSensorContext(tempDir);
    createSensor().execute(context);
    assertThat(logTester.logs()).containsExactly("No input files found for analysis",
      "Hit the cache for 0 out of 0", "Miss the cache for 0 out of 0");
  }

  @Test
  void should_fail_fast() throws Exception {
    createTsConfigFile();
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenThrow(new IOException("error"));
    TypeScriptSensor sensor = createSensor();
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
  void stop_analysis_if_server_is_not_responding() throws Exception {
    when(eslintBridgeServerMock.isAlive()).thenReturn(false);
    TypeScriptSensor sensor = createSensor();
    createTsConfigFile();
    createVueInputFile();
    createInputFile(context);
    sensor.execute(context);
    final LogAndArguments logAndArguments = logTester.getLogs(LoggerLevel.ERROR).get(0);
    assertThat(logAndArguments.getFormattedMsg()).isEqualTo("Failure during analysis, eslintBridgeServerMock command info");
    assertThat(((IllegalStateException) logAndArguments.getArgs().get()[0]).getMessage()).isEqualTo("eslint-bridge server is not answering");
  }

  @Test
  void stop_analysis_if_cancelled() throws Exception {
    TypeScriptSensor sensor = createSensor();
    createInputFile(context);
    setSonarLintRuntime(context);
    createTsConfigFile();
    context.setCancelled(true);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.INFO)).contains("org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state");
  }

  @Test
  void log_debug_analyzed_filename_with_program() throws Exception {
    TypeScriptSensor sensor = createSensor();
    createTsConfigFile();
    DefaultInputFile inputFile = createInputFile(context);
    var tsProgram = new TsProgram("1", List.of(inputFile.absolutePath()), List.of());
    when(eslintBridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(new AnalysisResponse());

    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Analyzing file: " + inputFile.uri());
  }

  @Test
  void log_debug_analyzed_filename_with_tsconfig() throws Exception {
    AnalysisResponse expectedResponse = createResponse();
    when(eslintBridgeServerMock.analyzeTypeScript(any())).thenReturn(expectedResponse);
    TypeScriptSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    // having a vue file makes TypeScriptSensor#shouldAnalyzeWithProgram() return false, which leads to the path that executes TypeScript#analyze()
    createVueInputFile();
    createTsConfigFile();

    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Analyzing file: " + inputFile.uri());
  }

  private TypeScriptSensor createSensor() {
    return new TypeScriptSensor(
      checks(ESLINT_BASED_RULE, "S2260"),
      eslintBridgeServerMock,
      analysisWarnings,
      tempFolder,
      monitoring,
      processAnalysis,
      analysisWithProgram());
  }

  private AnalysisWithProgram analysisWithProgram() {
    return new AnalysisWithProgram(eslintBridgeServerMock, monitoring, processAnalysis, analysisWarnings);
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

  private DefaultInputFile createInputFile(SensorContextTester context) {
    return createInputFile(context, "dir/file.ts");
  }

  private DefaultInputFile createInputFile(SensorContextTester context, String relativePath) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", baseDir.toFile(), baseDir.resolve(relativePath).toFile())
      .setLanguage("ts")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private void createTsConfigFile() throws IOException {
    Files.writeString(baseDir.resolve("tsconfig.json"), "{}");
  }

  private void createVueInputFile() {
    createVueInputFile(context);
  }

  private void createVueInputFile(SensorContextTester context) {
    var vueFile = new TestInputFileBuilder("moduleKey", baseDir.toFile(), baseDir.resolve("file.vue").toFile())
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

  private static TypeScriptChecks checks(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(CheckList.TS_REPOSITORY_KEY, ruleKey)).build());
    }
    return new TypeScriptChecks(new CheckFactory(builder.build()));
  }
}
