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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
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
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.slf4j.event.Level;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.batch.sensor.issue.IssueLocation;
import org.sonar.api.batch.sensor.issue.internal.DefaultNoSonarFilter;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.testfixtures.log.LogAndArguments;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.TestUtils;
import org.sonar.plugins.javascript.bridge.BridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.bridge.cache.CacheTestUtils;

class HtmlSensorTest {

  private static final String DUPLICATE_BRANCH_RULE_KEY = "S3923";
  private static final String PARSING_ERROR_RULE_KEY = "S2260";

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @Mock
  private BridgeServer bridgeServerMock;

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  @TempDir
  Path baseDir;

  private SensorContextTester context;

  @TempDir
  Path workDir;

  @TempDir
  Path monitoringDir;

  private Monitoring monitoring;
  private AnalysisProcessor analysisProcessor;

  @BeforeEach
  public void setUp() throws Exception {
    monitoring = new Monitoring(new MapSettings().asConfig());
    MockitoAnnotations.initMocks(this);

    // reset is required as this static value might be set by another test
    PluginInfo.setUcfgPluginVersion(null);

    when(bridgeServerMock.isAlive()).thenReturn(true);
    when(bridgeServerMock.analyzeHtml(any())).thenReturn(new AnalysisResponse());
    when(bridgeServerMock.getCommandInfo()).thenReturn("bridgeServerMock command info");

    context = SensorContextTester.create(baseDir);
    context.setPreviousCache(mock(ReadCache.class));
    context.setNextCache(mock(WriteCache.class));
    context.fileSystem().setWorkDir(workDir);

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);

    analysisProcessor =
      new AnalysisProcessor(new DefaultNoSonarFilter(), fileLinesContextFactory, monitoring);
  }

  @Test
  void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("JavaScript inside HTML analysis");
    assertThat(descriptor.languages()).containsOnly(HtmlSensor.LANGUAGE);
  }

  @Test
  void should_create_issues() throws Exception {
    AnalysisResponse expectedResponse = response(
      "{ issues: [" +
      "{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []}," +
      "{\"line\":1,\"column\":1,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Line issue message\", \"secondaryLocations\": []}" +
      "]}"
    );
    when(bridgeServerMock.analyzeHtml(any())).thenReturn(expectedResponse);

    HtmlSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);
    verify(bridgeServerMock, times(1)).initLinter(any(), any(), any(), any());
    assertThat(context.allIssues()).hasSize(2);

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
      .isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 0), new DefaultTextPointer(1, 15)));

    assertThat(firstIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(secondIssue.ruleKey().rule()).isEqualTo("S3923");
    assertThat(logTester.logs(LoggerLevel.WARN))
      .doesNotContain(
        "Custom JavaScript rules are deprecated and API will be removed in future version."
      );
  }

  @Test
  void should_ignore_template_extensions() throws Exception {
    var htmPath = "dir/file.HTM";
    var htmlPath = "dir/file.html";
    var templatePath = "dir/file.chtml";

    var context = SensorContextTester.create(baseDir);
    context.setPreviousCache(mock(ReadCache.class));
    context.setNextCache(mock(WriteCache.class));
    context.fileSystem().setWorkDir(workDir);

    var htmFile = TestUtils.createInputFile(context, getInputFileContent(), htmPath, "web");
    var htmlFile = TestUtils.createInputFile(context, getInputFileContent(), htmlPath, "web");
    var templateFile = TestUtils.createInputFile(
      context,
      getInputFileContent(),
      templatePath,
      "web"
    );

    when(bridgeServerMock.analyzeHtml(any())).thenReturn(new AnalysisResponse());

    HtmlSensor sensor = createSensor();
    sensor.execute(context);
    verify(bridgeServerMock, times(2)).analyzeHtml(any());
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Analyzing file: " + htmFile.uri());
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Analyzing file: " + htmlFile.uri());
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .doesNotContain("Analyzing file: " + templateFile.uri());
  }

  @Test
  void should_raise_a_parsing_error() throws IOException {
    when(bridgeServerMock.analyzeHtml(any()))
      .thenReturn(
        new Gson()
          .fromJson(
            "{ parsingError: { line: 1, message: \"Parse error message\", code: \"Parsing\"} }",
            AnalysisResponse.class
          )
      );

    createInputFile(context);
    createSensor().execute(context);

    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);

    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange().start().line()).isEqualTo(1);
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to parse file [dir/file.html] at line 1: Parse error message");
  }

  @Test
  void should_not_explode_if_no_response() throws Exception {
    when(bridgeServerMock.analyzeHtml(any())).thenThrow(new IOException("error"));

    HtmlSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to get response while analyzing " + inputFile.uri());
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  void stop_analysis_if_cancelled() throws Exception {
    HtmlSensor sensor = createSensor();

    createInputFile(context);
    context.setCancelled(true);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.INFO))
      .contains(
        "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
      );
  }

  @Test
  void log_debug_analyzed_filename() throws Exception {
    when(bridgeServerMock.analyzeHtml(any())).thenReturn(new AnalysisResponse());

    HtmlSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Analyzing file: " + inputFile.uri());
  }

  @Test
  void should_not_save_cached_cpd() throws IOException {
    var path = "dir/file.html";
    var context = CacheTestUtils.createContextWithCache(baseDir, workDir, path);
    var file = TestUtils
      .createInputFile(context, getInputFileContent(), path)
      .setStatus(InputFile.Status.SAME);
    var sensor = createSensor();

    sensor.execute(context);

    assertThat(context.cpdTokens(file.key())).isNull();
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .doesNotContain("Processing cache analysis of file: " + file.uri());
  }

  @Test
  void should_save_performance_metrics() throws Exception {
    var expectedResponse = response(
      "{ issues: []," +
      "\"metrics\": { \"ncloc\": [1]}, " +
      "\"perf\":{\"parseTime\":12,\"analysisTime\":40}" +
      "}"
    );
    when(bridgeServerMock.analyzeHtml(any())).thenReturn(expectedResponse);

    var settings = new MapSettings();
    settings.setProperty("sonar.javascript.monitoring", true);
    settings.setProperty("sonar.javascript.monitoring.path", monitoringDir.toString());
    monitoring = new Monitoring(settings.asConfig());
    analysisProcessor =
      new AnalysisProcessor(new DefaultNoSonarFilter(), fileLinesContextFactory, monitoring);
    var path = "dir/file.html";
    var context = CacheTestUtils.createContextWithCache(baseDir, workDir, path);
    TestUtils
      .createInputFile(context, getInputFileContent(), path, "web")
      .setStatus(InputFile.Status.SAME);
    var sensor = createSensor();

    sensor.execute(context);
    // We need to call monitor.stop() by hand. In a Sonar product, this gets called somehow.
    monitoring.stop();
    var metrics = Files.readString(monitoringDir.resolve("metrics.json"));
    assertThat(metrics)
      .contains("\"ncloc\":1")
      .contains("\"parseTime\":12")
      .contains("\"analysisTime\":40");
  }

  private static JsTsChecks checks(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(
        new NewActiveRule.Builder()
          .setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, ruleKey))
          .build()
      );
    }
    return new JsTsChecks(new CheckFactory(builder.build()));
  }

  private static DefaultInputFile createInputFile(SensorContextTester context) {
    return createInputFile(context, getInputFileContent());
  }

  private static String getInputFileContent() {
    return (
      "<!doctype html>\n" +
      "<html lang=\"en\">\n" +
      "<script>\n" +
      "  if (foo()) bar(); else bar();\n" +
      "</script>\n" +
      "</html>\n"
    );
  }

  private static DefaultInputFile createInputFile(SensorContextTester context, String contents) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "dir/file.html")
      .setLanguage(HtmlSensor.LANGUAGE)
      .setCharset(StandardCharsets.UTF_8)
      .setContents(contents)
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private HtmlSensor createSensor() {
    return new HtmlSensor(
      checks(DUPLICATE_BRANCH_RULE_KEY, PARSING_ERROR_RULE_KEY),
      bridgeServerMock,
      new AnalysisWarningsWrapper(),
      monitoring,
      analysisProcessor
    );
  }

  private AnalysisResponse response(String json) {
    return new Gson().fromJson(json, AnalysisResponse.class);
  }
}
