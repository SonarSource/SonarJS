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

import static java.util.Collections.emptyList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
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
import org.sonar.plugins.javascript.nodejs.NodeCommandException;

class JavaScriptEslintBasedSensorTest {

  private static final String ESLINT_BASED_RULE = "S3923";

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Mock
  private EslintBridgeServer eslintBridgeServerMock;

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  @TempDir
  Path baseDir;

  @TempDir
  File tempDir;

  TempFolder tempFolder;

  private SensorContextTester context;

  @TempDir
  Path workDir;

  private final Monitoring monitoring = new Monitoring(new MapSettings().asConfig());
  private AnalysisProcessor analysisProcessor;
  private AnalysisWithProgram analysisWithProgram;
  private AnalysisWithWatchProgram analysisWithWatchProgram;
  private EslintBridgeServer.TsProgram tsProgram;

  @BeforeEach
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);

    // reset is required as this static value might be set by another test
    PluginInfo.setUcfgPluginVersion(null);

    // Avoid shortpaths on windows
    baseDir = baseDir.toRealPath();
    workDir = workDir.toRealPath();
    tempDir = tempDir.getCanonicalFile();

    when(eslintBridgeServerMock.isAlive()).thenReturn(true);
    when(eslintBridgeServerMock.analyzeJavaScript(any())).thenReturn(new AnalysisResponse());
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(new AnalysisResponse());
    when(eslintBridgeServerMock.getCommandInfo()).thenReturn("eslintBridgeServerMock command info");
    tsProgram = new EslintBridgeServer.TsProgram("", new ArrayList<>(), List.of());
    when(eslintBridgeServerMock.createProgram(any())).thenReturn(tsProgram);
    context = SensorContextTester.create(baseDir);
    context.fileSystem().setWorkDir(workDir);
    context.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 3),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    tempFolder = new DefaultTempFolder(tempDir, true);

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
    analysisProcessor =
      new AnalysisProcessor(new DefaultNoSonarFilter(), fileLinesContextFactory, monitoring);
    analysisWithProgram =
      new AnalysisWithProgram(
        eslintBridgeServerMock,
        monitoring,
        analysisProcessor,
        new AnalysisWarningsWrapper()
      );
    analysisWithWatchProgram =
      new AnalysisWithWatchProgram(eslintBridgeServerMock, monitoring, analysisProcessor);
  }

  @Test
  void should_create_issues() throws Exception {
    AnalysisResponse responseIssues = response(
      "{ issues: [{" +
      "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []}," +
      "{\"line\":1,\"column\":1,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Line issue message\", \"secondaryLocations\": []}," +
      "{\"line\":0,\"column\":1,\"ruleId\":\"file-header\",\"message\":\"File issue message\", \"secondaryLocations\": []}" +
      "]}"
    );
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(responseIssues);

    JavaScriptEslintBasedSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);
    verify(eslintBridgeServerMock, times(1)).initLinter(any(), any(), any(), any());
    assertThat(context.allIssues()).hasSize(3);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue firstIssue = issues.next();
    Issue secondIssue = issues.next();
    Issue thirdIssue = issues.next();

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

    location = thirdIssue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("File issue message");
    assertThat(location.textRange()).isNull();

    assertThat(firstIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(secondIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(thirdIssue.ruleKey().rule()).isEqualTo("S1451");
    assertThat(logTester.logs(LoggerLevel.WARN))
      .doesNotContain(
        "Custom JavaScript rules are deprecated and API will be removed in future version."
      );
  }

  @Test
  void should_set_quickfixavailable() throws Exception {
    AnalysisResponse responseIssues = response(
      "{ issues: [{" +
      "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []," +
      "\"quickFixes\": [{ message: \"msg\", edits: [] }] " +
      "}" +
      "]}"
    );
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(responseIssues);

    var sensor = createSensor();
    createInputFile(context);
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);
    var issue = context.allIssues().iterator().next();
    assertThat(issue.isQuickFixAvailable()).isTrue();

    var context91 = SensorContextTester.create(baseDir);
    context91.fileSystem().setWorkDir(workDir);
    context91.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 1),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    createInputFile(context91);

    sensor.execute(context91);
    assertThat(context91.allIssues()).hasSize(1);
    issue = context91.allIssues().iterator().next();
    assertThat(issue.isQuickFixAvailable()).isFalse();
  }

  @Test
  void should_report_secondary_issue_locations() throws Exception {
    when(eslintBridgeServerMock.analyzeWithProgram(any()))
      .thenReturn(
        response(
          "{ issues: [{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", " +
          "\"cost\": 14," +
          "\"secondaryLocations\": [" +
          "{ message: \"Secondary\", \"line\":2,\"column\":0,\"endLine\":2,\"endColumn\":3}," +
          "{ message: \"Secondary\", \"line\":3,\"column\":1,\"endLine\":3,\"endColumn\":4}" +
          "]}]}"
        )
      );

    JavaScriptEslintBasedSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    assertThat(issue.gap()).isEqualTo(14);

    assertThat(issue.flows()).hasSize(2);

    IssueLocation secondary1 = issue.flows().get(0).locations().get(0);
    assertThat(secondary1.inputComponent()).isEqualTo(inputFile);
    assertThat(secondary1.message()).isEqualTo("Secondary");
    assertThat(secondary1.textRange())
      .isEqualTo(new DefaultTextRange(new DefaultTextPointer(2, 0), new DefaultTextPointer(2, 3)));

    IssueLocation secondary2 = issue.flows().get(1).locations().get(0);
    assertThat(secondary2.inputComponent()).isEqualTo(inputFile);
    assertThat(secondary2.message()).isEqualTo("Secondary");
    assertThat(secondary2.textRange())
      .isEqualTo(new DefaultTextRange(new DefaultTextPointer(3, 1), new DefaultTextPointer(3, 4)));
  }

  @Test
  void should_not_report_secondary_when_location_are_null() throws Exception {
    when(eslintBridgeServerMock.analyzeWithProgram(any()))
      .thenReturn(
        response(
          "{ issues: [{\"line\":1,\"column\":3,\"endLine\":3,\"endColumn\":5,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", " +
          "\"secondaryLocations\": [" +
          "{ message: \"Secondary\", \"line\":2,\"column\":1,\"endLine\":null,\"endColumn\":4}" +
          "]}]}"
        )
      );

    JavaScriptEslintBasedSensor sensor = createSensor();
    createInputFile(context);
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    assertThat(issue.flows()).isEmpty();
  }

  @Test
  void should_report_cost() throws Exception {
    when(eslintBridgeServerMock.analyzeWithProgram(any()))
      .thenReturn(
        response(
          "{ issues: [{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", " +
          "\"cost\": 42," +
          "\"secondaryLocations\": []}]}"
        )
      );

    JavaScriptEslintBasedSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    IssueLocation location = issue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange())
      .isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4)));

    assertThat(issue.gap()).isEqualTo(42);
    assertThat(issue.flows()).isEmpty();
  }

  @Test
  void should_save_metrics() throws Exception {
    AnalysisResponse responseMetrics = response(
      "{ metrics: {\"ncloc\":[1, 2, 3],\"commentLines\":[4, 5, 6],\"nosonarLines\":[7, 8, 9],\"executableLines\":[10, 11, 12],\"functions\":1,\"statements\":2,\"classes\":3,\"complexity\":4,\"cognitiveComplexity\":5} }"
    );
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(responseMetrics);

    JavaScriptEslintBasedSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);

    assertThat(context.measure(inputFile.key(), CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(inputFile.key(), CoreMetrics.STATEMENTS).value()).isEqualTo(2);
    assertThat(context.measure(inputFile.key(), CoreMetrics.CLASSES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.NCLOC).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMMENT_LINES).value()).isEqualTo(3);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COMPLEXITY).value()).isEqualTo(4);
    assertThat(context.measure(inputFile.key(), CoreMetrics.COGNITIVE_COMPLEXITY).value())
      .isEqualTo(5);
  }

  @Test
  void should_save_only_nosonar_metric_in_sonarlint() throws Exception {
    AnalysisResponse responseMetrics = response("{ metrics: {\"nosonarLines\":[7, 8, 9]} }");
    var inputFile = createInputFile(context);
    var tsConfigFile = new TsConfigFile(
      "/path/to/file",
      List.of(inputFile.absolutePath()),
      emptyList()
    );
    when(eslintBridgeServerMock.analyzeJavaScript(any())).thenReturn(responseMetrics);
    when(eslintBridgeServerMock.createTsConfigFile(any())).thenReturn(tsConfigFile);
    when(eslintBridgeServerMock.loadTsConfig(any())).thenReturn(tsConfigFile);

    context.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    var sensor = createSensor(mock(JavaScriptProjectChecker.class));
    sensor.execute(context);

    assertThat(inputFile.hasNoSonarAt(7)).isTrue();
    assertThat(context.measures(inputFile.key())).isEmpty();
    assertThat((context.cpdTokens(inputFile.key()))).isNull();
  }

  @Test
  void should_save_only_nosonar_metric_for_test() throws Exception {
    AnalysisResponse responseMetrics = response("{ metrics: {\"nosonarLines\":[7, 8, 9]} }");
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(responseMetrics);

    JavaScriptEslintBasedSensor sensor = createSensor();

    DefaultInputFile inputFile = createInputFile(context);
    DefaultInputFile testInputFile = createTestInputFile(context);
    sensor.execute(context);

    assertThat(testInputFile.hasNoSonarAt(7)).isTrue();
    assertThat(context.measures(testInputFile.key())).isEmpty();
    assertThat((context.cpdTokens(testInputFile.key()))).isNull();

    assertThat(inputFile.hasNoSonarAt(7)).isTrue();
    assertThat(context.measures(inputFile.key())).hasSize(7);
    assertThat((context.cpdTokens(inputFile.key()))).isEmpty();
  }

  @Test
  void should_save_highlights() throws Exception {
    AnalysisResponse responseCpdTokens = response(
      "{ highlights: [{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"textType\":\"KEYWORD\"},{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"textType\":\"CONSTANT\"}] }"
    );
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(responseCpdTokens);

    JavaScriptEslintBasedSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);

    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 1, 0).get(0))
      .isEqualTo(TypeOfText.KEYWORD);
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1)).isNotEmpty();
    assertThat(context.highlightingTypeAt(inputFile.key(), 2, 1).get(0))
      .isEqualTo(TypeOfText.CONSTANT);
    assertThat(context.highlightingTypeAt(inputFile.key(), 3, 0)).isEmpty();
  }

  @Test
  void should_save_cpd() throws Exception {
    AnalysisResponse responseCpdTokens = response(CacheTestUtils.CPD_TOKENS);
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenReturn(responseCpdTokens);

    JavaScriptEslintBasedSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);

    assertThat(context.cpdTokens(inputFile.key())).hasSize(2);
  }

  @Test
  void should_catch_if_bridge_server_not_started() throws Exception {
    doThrow(new IllegalStateException("failed to start server"))
      .when(eslintBridgeServerMock)
      .startServerLazily(context);

    JavaScriptEslintBasedSensor sensor = createSensor();
    createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failure during analysis, eslintBridgeServerMock command info");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  void should_not_explode_if_no_response() throws Exception {
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenThrow(new IOException("error"));
    JavaScriptEslintBasedSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to get response while analyzing " + inputFile);
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("JavaScript analysis");
    assertThat(descriptor.languages()).containsOnly("js");
  }

  @Test
  void should_have_configured_rules() throws Exception {
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
    ); // no-all-duplicated-branches, without config
    CheckFactory checkFactory = new CheckFactory(builder.build());

    var checks = new JavaScriptChecks(checkFactory);
    List<EslintRule> rules = checks.eslintRules();

    assertThat(rules).hasSize(3);

    assertThat(rules.get(0).key).isEqualTo("no-duplicate-string");
    assertThat(rules.get(0).configurations).containsExactly(3);

    assertThat(rules.get(1).key).isEqualTo("max-switch-cases");
    assertThat(rules.get(1).configurations).containsExactly(42);

    assertThat(rules.get(2).key).isEqualTo("no-all-duplicated-branches");
    assertThat(rules.get(2).configurations).isEmpty();
  }

  @Test
  void should_skip_analysis_when_no_files() throws Exception {
    var analysisWarnings = new AnalysisWarningsWrapper();
    var javaScriptEslintBasedSensor = new JavaScriptEslintBasedSensor(
      checks(ESLINT_BASED_RULE),
      eslintBridgeServerMock,
      analysisWarnings,
      tempFolder,
      monitoring,
      analysisWithProgram,
      analysisWithWatchProgram
    );
    javaScriptEslintBasedSensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.INFO)).contains("No input files found for analysis");
  }

  @Test
  void handle_missing_node() throws Exception {
    doThrow(new NodeCommandException("Exception Message", new IOException()))
      .when(eslintBridgeServerMock)
      .startServerLazily(any());

    TestAnalysisWarnings analysisWarnings = new TestAnalysisWarnings();
    JavaScriptEslintBasedSensor javaScriptEslintBasedSensor = new JavaScriptEslintBasedSensor(
      checks(ESLINT_BASED_RULE),
      eslintBridgeServerMock,
      analysisWarnings,
      tempFolder,
      monitoring,
      analysisWithProgram,
      analysisWithWatchProgram
    );
    createInputFile(context);
    javaScriptEslintBasedSensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Exception Message");
    assertThat(analysisWarnings.warnings)
      .containsExactly("JavaScript/TypeScript/CSS rules were not executed. Exception Message");
  }

  @Test
  void log_debug_if_already_failed_server() throws Exception {
    doThrow(new ServerAlreadyFailedException())
      .when(eslintBridgeServerMock)
      .startServerLazily(any());
    JavaScriptEslintBasedSensor javaScriptEslintBasedSensor = createSensor();
    createInputFile(context);
    javaScriptEslintBasedSensor.execute(context);

    assertThat(logTester.logs())
      .contains(
        "Skipping the start of eslint-bridge server as it failed to start during the first analysis or it's not answering anymore",
        "No rules will be executed"
      );
  }

  @Test
  void stop_analysis_if_server_is_not_responding() throws Exception {
    when(eslintBridgeServerMock.isAlive()).thenReturn(false);
    JavaScriptEslintBasedSensor javaScriptEslintBasedSensor = createSensor();
    createInputFile(context);
    javaScriptEslintBasedSensor.execute(context);
    final LogAndArguments logAndArguments = logTester.getLogs(LoggerLevel.ERROR).get(0);
    assertThat(logAndArguments.getFormattedMsg())
      .isEqualTo("Failure during analysis, eslintBridgeServerMock command info");
    assertThat(((IllegalStateException) logAndArguments.getArgs().get()[0]).getMessage())
      .isEqualTo("eslint-bridge server is not answering");
  }

  @Test
  void should_raise_a_parsing_error() throws IOException {
    when(eslintBridgeServerMock.analyzeWithProgram(any()))
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
      .contains("Failed to parse file [dir/file.js] at line 3: Parse error message");
  }

  @Test
  void should_not_create_parsing_issue_when_no_rule() throws IOException {
    when(eslintBridgeServerMock.analyzeWithProgram(any()))
      .thenReturn(
        new Gson()
          .fromJson(
            "{ parsingError: { line: 3, message: \"Parse error message\", code: \"Parsing\"} }",
            AnalysisResponse.class
          )
      );
    createInputFile(context);
    new JavaScriptEslintBasedSensor(
      checks(ESLINT_BASED_RULE),
      eslintBridgeServerMock,
      null,
      tempFolder,
      monitoring,
      analysisWithProgram,
      analysisWithWatchProgram
    )
      .execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).isEmpty();
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to parse file [dir/file.js] at line 3: Parse error message");
  }

  @Test
  void should_send_content_on_sonarlint() throws Exception {
    var ctx = SensorContextTester.create(baseDir);
    ctx.fileSystem().setWorkDir(workDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    var inputFile = createInputFile(ctx);

    var tsConfigFile = new TsConfigFile(
      "/path/to/file",
      List.of(inputFile.absolutePath()),
      emptyList()
    );
    when(eslintBridgeServerMock.createTsConfigFile(any())).thenReturn(tsConfigFile);
    when(eslintBridgeServerMock.loadTsConfig(any())).thenReturn(tsConfigFile);
    when(eslintBridgeServerMock.analyzeJavaScript(any())).thenReturn(new AnalysisResponse());
    var captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);

    createSensor(mock(JavaScriptProjectChecker.class)).execute(ctx);
    verify(eslintBridgeServerMock).analyzeJavaScript(captor.capture());
    assertThat(captor.getValue().fileContent)
      .isEqualTo("if (cond)\n" + "doFoo(); \n" + "else \n" + "doFoo();");
    assertThat(captor.getValue().tsConfigs).containsExactly("/path/to/file");

    clearInvocations(eslintBridgeServerMock);
    ctx = SensorContextTester.create(baseDir);
    ctx.fileSystem().setWorkDir(workDir);
    ctx.setNextCache(mock(WriteCache.class));
    createInputFile(ctx);

    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeWithProgram(captor.capture());
    assertThat(captor.getValue().fileContent).isNull();
  }

  @Test
  void should_send_content_when_not_utf8() throws Exception {
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setNextCache(mock(WriteCache.class));
    ctx.fileSystem().setWorkDir(workDir);
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
    ctx.fileSystem().add(inputFile);
    tsProgram.files.add(inputFile.absolutePath());

    ArgumentCaptor<JsAnalysisRequest> captor = ArgumentCaptor.forClass(JsAnalysisRequest.class);
    createSensor().execute(ctx);
    verify(eslintBridgeServerMock).analyzeWithProgram(captor.capture());
    assertThat(captor.getValue().fileContent).isEqualTo(content);
  }

  @Test
  void should_fail_fast() throws Exception {
    when(eslintBridgeServerMock.analyzeWithProgram(any())).thenThrow(new IOException("error"));
    JavaScriptEslintBasedSensor sensor = createSensor();
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    DefaultInputFile inputFile = createInputFile(context);
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis failed (\"sonar.internal.analysis.failFast\"=true)");
  }

  @Test
  void should_fail_fast_with_nodecommandexception() throws Exception {
    doThrow(new NodeCommandException("error"))
      .when(eslintBridgeServerMock)
      .startServerLazily(any());
    JavaScriptEslintBasedSensor sensor = createSensor();
    MapSettings settings = new MapSettings().setProperty("sonar.internal.analysis.failFast", true);
    context.setSettings(settings);
    createInputFile(context);
    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Analysis failed (\"sonar.internal.analysis.failFast\"=true)");
  }

  @Test
  void stop_analysis_if_cancelled() throws Exception {
    JavaScriptEslintBasedSensor sensor = createSensor();
    createInputFile(context);
    context.setCancelled(true);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.INFO))
      .contains(
        "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
      );
  }

  @Test
  void should_save_cached_cpd() throws IOException {
    var path = "dir/file.js";
    var context = CacheTestUtils.createContextWithCache(baseDir, workDir, path);
    var file = TestUtils
      .createInputFile(context, "if (cond)\ndoFoo(); \nelse \ndoFoo();", path)
      .setStatus(InputFile.Status.SAME);
    tsProgram.files.add(file.absolutePath());
    var sensor = createSensor();

    sensor.execute(context);

    assertThat(context.cpdTokens(file.key())).hasSize(2);
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains("Processing cache analysis of file: " + file.uri());
  }

  @Test
  void log_debug_analyzed_filename() throws Exception {
    when(eslintBridgeServerMock.analyzeJavaScript(any())).thenReturn(new AnalysisResponse());
    JavaScriptEslintBasedSensor sensor = createSensor();
    InputFile file = createInputFile(context);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Analyzing file: " + file.uri());
  }

  private static JavaScriptChecks checks(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(
        new NewActiveRule.Builder()
          .setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, ruleKey))
          .build()
      );
    }
    return new JavaScriptChecks(new CheckFactory(builder.build()));
  }

  private DefaultInputFile createInputFile(SensorContextTester context) {
    var inputFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("dir/file.js").toFile()
    )
      .setLanguage("js")
      .setCharset(StandardCharsets.UTF_8)
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    tsProgram.files.add(inputFile.absolutePath());
    return inputFile;
  }

  private DefaultInputFile createTestInputFile(SensorContextTester context) {
    var inputFile = new TestInputFileBuilder(
      "moduleKey",
      baseDir.toFile(),
      baseDir.resolve("dir/test.js").toFile()
    )
      .setLanguage("js")
      .setType(Type.TEST)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    tsProgram.files.add(inputFile.absolutePath());
    return inputFile;
  }

  private JavaScriptEslintBasedSensor createSensor() {
    return createSensor(null);
  }

  private JavaScriptEslintBasedSensor createSensor(
    @Nullable JavaScriptProjectChecker javaScriptProjectChecker
  ) {
    return new JavaScriptEslintBasedSensor(
      checks(ESLINT_BASED_RULE, "S2260", "S1451"),
      eslintBridgeServerMock,
      new AnalysisWarningsWrapper(),
      tempFolder,
      monitoring,
      javaScriptProjectChecker,
      analysisWithProgram,
      analysisWithWatchProgram
    );
  }

  private AnalysisResponse response(String json) {
    return new Gson().fromJson(json, AnalysisResponse.class);
  }
}
