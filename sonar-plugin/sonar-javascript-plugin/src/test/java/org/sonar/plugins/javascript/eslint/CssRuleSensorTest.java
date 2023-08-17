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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.eslint.BridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.BridgeServer.CssAnalysisRequest;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;

class CssRuleSensorTest {

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Mock
  private BridgeServer bridgeServerMock;

  @Mock
  private FileLinesContextFactory fileLinesContextFactory;

  @TempDir
  Path baseDir;

  @TempDir
  File tempDir;

  @TempDir
  Path workDir;

  TempFolder tempFolder;

  private SensorContextTester context;

  private static final CheckFactory CHECK_FACTORY = new CheckFactory(
    activeRules("S4647", "S4656", "S4658")
  );

  private CssRuleSensor sensor;

  @BeforeEach
  public void setUp() throws IOException {
    MockitoAnnotations.initMocks(this);
    when(bridgeServerMock.isAlive()).thenReturn(true);
    when(bridgeServerMock.analyzeCss(any()))
      .thenReturn(
        response(
          "{ issues: [{\"line\":2,\"ruleId\":\"block-no-empty\",\"message\":\"Unexpected empty block\"}]}"
        )
      );
    when(bridgeServerMock.getCommandInfo()).thenReturn("bridgeServerMock command info");
    context = SensorContextTester.create(baseDir);
    context.fileSystem().setWorkDir(workDir);
    tempFolder = new DefaultTempFolder(tempDir, true);

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);

    SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarLint(Version.create(8, 9));
    sensor =
      new CssRuleSensor(
        sonarRuntime,
        bridgeServerMock,
        new AnalysisWarningsWrapper(),
        new Monitoring(new MapSettings().asConfig()),
        CHECK_FACTORY
      );
  }

  static ActiveRules activeRules(String... rules) {
    var activeRulesBuilder = new ActiveRulesBuilder();
    for (String rule : rules) {
      var activeRule = new NewActiveRule.Builder().setRuleKey(RuleKey.of("css", rule)).build();
      activeRulesBuilder.addRule(activeRule);
    }
    return activeRulesBuilder.build();
  }

  @Test
  void test_descriptor() {
    DefaultSensorDescriptor sensorDescriptor = new DefaultSensorDescriptor();
    sensor.describe(sensorDescriptor);
    assertThat(sensorDescriptor.name()).isEqualTo("CSS Rules");
    assertThat(sensorDescriptor.languages()).isEmpty();
    assertThat(sensorDescriptor.configurationPredicate()).isNull();
    assertThat(sensorDescriptor.ruleRepositories()).containsOnly("css");
    // true even for SonarLint runtime (see setUp) as this sensor is hardcoded by name
    assertTrue(sensorDescriptor.isProcessesFilesIndependently());
  }

  @Test
  void test_descriptor_sonarlint() {
    var sonarlintDescriptor =
      new org.sonarsource.sonarlint.core.analysis.sonarapi.DefaultSensorDescriptor();
    // should not throw as 'processesFilesIndependently' is not executed for SonarLint
    sensor.describe(sonarlintDescriptor);
    assertThat(sonarlintDescriptor.name()).isEqualTo("CSS Rules");
  }

  @Test
  void test_descriptor_sonarqube_9_3() {
    SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarQube(
      Version.create(9, 3),
      SonarQubeSide.SCANNER,
      SonarEdition.COMMUNITY
    );
    sensor =
      new CssRuleSensor(
        sonarRuntime,
        bridgeServerMock,
        new AnalysisWarningsWrapper(),
        new Monitoring(new MapSettings().asConfig()),
        CHECK_FACTORY
      );
    DefaultSensorDescriptor sensorDescriptor = new DefaultSensorDescriptor();
    sensor.describe(sensorDescriptor);
    assertThat(sensorDescriptor.name()).isEqualTo("CSS Rules");
    assertTrue(sensorDescriptor.isProcessesFilesIndependently());
  }

  @Test
  void test_descriptor_sonarqube_9_2() {
    SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarQube(
      Version.create(9, 2),
      SonarQubeSide.SCANNER,
      SonarEdition.COMMUNITY
    );
    sensor =
      new CssRuleSensor(
        sonarRuntime,
        bridgeServerMock,
        new AnalysisWarningsWrapper(),
        new Monitoring(new MapSettings().asConfig()),
        CHECK_FACTORY
      );
    DefaultSensorDescriptor sensorDescriptor = new DefaultSensorDescriptor();
    sensor.describe(sensorDescriptor);
    assertThat(sensorDescriptor.name()).isEqualTo("CSS Rules");
    // true even for v9.2 as this sensor is hardcoded by name
    assertTrue(sensorDescriptor.isProcessesFilesIndependently());
  }

  @Test
  void test_execute() throws IOException {
    addInputFile("file.css");
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);
    assertThat(context.allIssues())
      .extracting("primaryLocation.message")
      .containsOnly("Unexpected empty block");

    assertThat(String.join("\n", logTester.logs(LoggerLevel.DEBUG)))
      .matches("(?s).*Analyzing file: \\S*file\\.css.*")
      .matches("(?s).*Found 1 issue\\(s\\).*");
  }

  @Test
  void should_trim_rule_key_from_message() throws IOException {
    AnalysisResponse responseIssues = response(
      "{ issues: [{\"line\":2,\"ruleId\":\"color-no-invalid-hex\",\"message\":\"some message (color-no-invalid-hex)\"}]}"
    );
    when(bridgeServerMock.analyzeCss(any())).thenReturn(responseIssues);

    addInputFile("file-with-rule-id-message.css");
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);
    assertThat(context.allIssues())
      .extracting("primaryLocation.message")
      .containsOnly("some message");

    assertThat(String.join("\n", logTester.logs(LoggerLevel.DEBUG)))
      .matches("(?s).*Analyzing file: \\S*file-with-rule-id-message\\.css.*")
      .matches("(?s).*Found 1 issue\\(s\\).*");
  }

  @Test
  void test_non_css_files() {
    DefaultInputFile fileCss = addInputFile("file.css");
    DefaultInputFile fileHtml = addInputFile("file.web");
    DefaultInputFile filePhp = addInputFile("file.php");
    DefaultInputFile fileVue = addInputFile("file.vue");
    addInputFile("file.js");

    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(4);
    assertThat(context.allIssues())
      .extracting("primaryLocation.component")
      .containsOnly(fileCss, fileHtml, filePhp, fileVue);
  }

  @Test
  void test_no_file_to_analyze() {
    sensor.execute(context);
    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(LoggerLevel.ERROR)).isEmpty();
    assertThat(logTester.logs(LoggerLevel.INFO))
      .contains(
        "No CSS, PHP, HTML or VueJS files are found in the project. CSS analysis is skipped."
      );
  }

  @Test
  void failed_server_should_log_warn_no_css() throws IOException {
    context.settings().setProperty("sonar.internal.analysis.failFast", "true");
    doThrow(new NodeCommandException("Exception Message"))
      .when(bridgeServerMock)
      .startServerLazily(any());
    addInputFile("file.web");

    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("Analysis failed");
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("Exception Message");
  }

  @Test
  void failed_server_should_log_error_with_css() throws IOException {
    doThrow(new NodeCommandException("Exception Message"))
      .when(bridgeServerMock)
      .startServerLazily(any());
    addInputFile("file.css");

    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Exception Message");
  }

  @Test
  void should_not_analyze_files_with_not_file_uri() throws URISyntaxException, IOException {
    InputFile httpFile = mock(InputFile.class);
    when(httpFile.filename()).thenReturn("file.css");
    when(httpFile.uri()).thenReturn(new URI("http://lost-on-earth.com/file.css"));
    sensor.analyzeFile(httpFile, context, Collections.emptyList());
    assertThat(String.join("\n", logTester.logs(LoggerLevel.DEBUG)))
      .matches("(?s).*Skipping \\S*file.css as it has not 'file' scheme.*")
      .doesNotMatch("(?s).*\nAnalyzing \\S*file.css.*");
  }

  @Test
  void analysis_stop_when_server_is_not_anymore_alive() {
    addInputFile("file.css");
    when(bridgeServerMock.isAlive()).thenReturn(false);
    sensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failure during analysis, bridgeServerMock command info");
  }

  @Test
  void should_stop_execution_when_sensor_context_is_cancelled() {
    addInputFile("file.css");
    context.setCancelled(true);
    sensor.execute(context);
    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(LoggerLevel.INFO))
      .contains(
        "org.sonar.plugins.javascript.CancellationException: Analysis interrupted because the SensorContext is in cancelled state"
      );
  }

  @Test
  void test_syntax_error() throws IOException {
    AnalysisResponse responseIssues = response(
      "{ issues: [{\"line\":2,\"ruleId\":\"CssSyntaxError\",\"message\":\"Missed semicolon (CssSyntaxError)\"}]}"
    );
    when(bridgeServerMock.analyzeCss(any())).thenReturn(responseIssues);

    InputFile inputFile = addInputFile("syntax-error.css");
    InputFile inputFileNotCss = addInputFile("syntax-error.web");
    sensor.execute(context);
    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Failed to parse " + inputFile.uri() + ", line 2, Missed semicolon");
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains("Failed to parse " + inputFileNotCss.uri() + ", line 2, Missed semicolon");
  }

  @Test
  void test_unknown_rule() throws IOException {
    AnalysisResponse responseIssues = response(
      "{ issues: [{\"line\":2,\"ruleId\":\"unknown-rule-key\",\"message\":\"Some message\"}]}"
    );
    when(bridgeServerMock.analyzeCss(any())).thenReturn(responseIssues);

    addInputFile("unknown-rule.css");
    sensor.execute(context);

    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(LoggerLevel.ERROR))
      .contains("Unknown stylelint rule or rule not enabled: 'unknown-rule-key'");
  }

  @Test
  void should_not_send_file_content_if_encoding_is_utf8_and_context_is_not_sonarlint()
    throws IOException {
    String filePath = "copy-file-content-into-issue-message.css";
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", filePath)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("css content")
      .build();
    context.fileSystem().add(inputFile);
    sensor.execute(context);
    ArgumentCaptor<CssAnalysisRequest> capturedRequest = ArgumentCaptor.forClass(
      CssAnalysisRequest.class
    );
    verify(bridgeServerMock).analyzeCss(capturedRequest.capture());

    assertThat(capturedRequest.getValue().fileContent).isNull();
  }

  @Test
  void should_send_file_content_if_encoding_is_not_utf8() throws IOException {
    String filePath = "copy-file-content-into-issue-message.css";
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", filePath)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.ISO_8859_1)
      .setContents("css content")
      .build();
    context.fileSystem().add(inputFile);
    sensor.execute(context);
    ArgumentCaptor<CssAnalysisRequest> capturedRequest = ArgumentCaptor.forClass(
      CssAnalysisRequest.class
    );
    verify(bridgeServerMock).analyzeCss(capturedRequest.capture());

    assertThat(capturedRequest.getValue().fileContent).isEqualTo("css content");
  }

  @Test
  void should_send_file_content_if_context_is_sonarlint() throws IOException {
    context.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(7, 9)));
    addInputFile("file.css");
    sensor.execute(context);
    ArgumentCaptor<CssAnalysisRequest> capturedRequest = ArgumentCaptor.forClass(
      CssAnalysisRequest.class
    );
    verify(bridgeServerMock).analyzeCss(capturedRequest.capture());

    assertThat(capturedRequest.getValue().fileContent).isNotNull();
  }

  private DefaultInputFile addInputFile(String relativePath) {
    String extension = relativePath.split("\\.")[1];
    String language = extension.equals("vue") ? "js" : extension;
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setLanguage(language)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("some css content\n on 2 lines")
      .build();

    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private AnalysisResponse response(String json) {
    return new Gson().fromJson(json, AnalysisResponse.class);
  }
}
