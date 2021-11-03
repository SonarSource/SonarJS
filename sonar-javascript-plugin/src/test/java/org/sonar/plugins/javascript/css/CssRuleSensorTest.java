/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.css.plugin;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.css.plugin.server.CssAnalyzerBridgeServer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.verifyZeroInteractions;
import static org.mockito.Mockito.when;
import static org.sonar.css.plugin.server.CssAnalyzerBridgeServerTest.createCssAnalyzerBridgeServer;

public class CssRuleSensorTest {

  @Rule
  public final LogTester logTester = new LogTester();

  @Rule
  public TemporaryFolder tmpDir = new TemporaryFolder();

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  private static final CheckFactory CHECK_FACTORY = new CheckFactory(new TestActiveRules("S4647", "S4656", "S4658"));

  private static final File BASE_DIR = new File("src/test/resources").getAbsoluteFile();

  private SensorContextTester context = SensorContextTester.create(BASE_DIR);
  private AnalysisWarnings analysisWarnings = mock(AnalysisWarnings.class);
  private CssAnalyzerBridgeServer cssAnalyzerBridgeServer;
  private CssRuleSensor sensor;

  @Before
  public void setUp() {
    context.fileSystem().setWorkDir(tmpDir.getRoot().toPath());
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer();
    sensor = new CssRuleSensor(CHECK_FACTORY, cssAnalyzerBridgeServer, analysisWarnings);
  }

  @After
  public void tearDown() throws Exception {
    if (cssAnalyzerBridgeServer != null) {
      cssAnalyzerBridgeServer.stop();
    }
  }

  @Test
  public void test_descriptor() {
    DefaultSensorDescriptor sensorDescriptor = new DefaultSensorDescriptor();
    sensor.describe(sensorDescriptor);
    assertThat(sensorDescriptor.name()).isEqualTo("CSS Rules");
    assertThat(sensorDescriptor.languages()).isEmpty();
    assertThat(sensorDescriptor.configurationPredicate()).isNull();
    assertThat(sensorDescriptor.ruleRepositories()).containsOnly("css");
  }

  @Test
  public void test_execute() throws IOException {
    addInputFile("file.css");
    addInputFile("file-with-rule-id-message.css");
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(2);
    assertThat(context.allIssues()).extracting("primaryLocation.message")
      .containsOnly("some message", "Unexpected empty block");

    assertThat(String.join("\n", logTester.logs(LoggerLevel.DEBUG)))
      .matches("(?s).*Analyzing \\S*file\\.css.*")
      .matches("(?s).*Found 1 issue\\(s\\).*");

    Path configPath = Paths.get(context.fileSystem().workDir().getAbsolutePath(), "css-bundle", "stylelintconfig.json");
    assertThat(Files.readAllLines(configPath)).containsOnly(
      "{\"rules\":{" +
        "\"block-no-empty\":true," +
        "\"color-no-invalid-hex\":true," +
        "\"declaration-block-no-duplicate-properties\":[true,{\"ignore\":[\"consecutive-duplicates-with-different-values\"]}]" +
      "}}");
    verifyZeroInteractions(analysisWarnings);
  }

  @Test
  public void test_non_css_files() {
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
  public void test_no_file_to_analyze() throws IOException {
    sensor.execute(context);
    assertThat(context.allIssues()).hasSize(0);
    assertThat(logTester.logs(LoggerLevel.ERROR)).isEmpty();
    assertThat(logTester.logs(LoggerLevel.INFO)).contains("No CSS, PHP, HTML or VueJS files are found in the project. CSS analysis is skipped.");
  }

  @Test
  public void should_log_when_bridge_server_receives_invalid_response() {
    addInputFile("invalid-json-response.css");
    sensor.execute(context);
    assertThat(String.join("\n", logTester.logs(LoggerLevel.DEBUG)))
      .contains("Failed to parse response");
    assertThat(String.join("\n", logTester.logs(LoggerLevel.ERROR)))
      .contains("Failure during CSS analysis");
  }

  @Test
  public void should_fail_fast_when_server_fail_to_start() {
    context.settings().setProperty("sonar.internal.analysis.failFast", "true");
    CssAnalyzerBridgeServer badServer = createCssAnalyzerBridgeServer("throw.js");
    sensor = new CssRuleSensor(CHECK_FACTORY, badServer, analysisWarnings);
    addInputFile("file.css");

    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("Analysis failed");
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("CSS rules were not executed. Failed to start server (1s timeout)");
  }

  @Test
  public void should_fail_fast_when_server_fail_to_start_no_css() {
    context.settings().setProperty("sonar.internal.analysis.failFast", "true");
    CssAnalyzerBridgeServer badServer = createCssAnalyzerBridgeServer("throw.js");
    sensor = new CssRuleSensor(CHECK_FACTORY, badServer, analysisWarnings);
    addInputFile("file.web");

    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("Analysis failed");
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("CSS rules were not executed. Failed to start server (1s timeout)");
  }

  @Test
  public void should_not_fail_fast_when_server_fail_to_start_without_property() {
    context.settings().setProperty("sonar.internal.analysis.failFast", "false");
    CssAnalyzerBridgeServer badServer = createCssAnalyzerBridgeServer("throw.js");
    sensor = new CssRuleSensor(CHECK_FACTORY, badServer, analysisWarnings);
    addInputFile("file.web");

    sensor.execute(context);
    // log as Warning level is there is no CSS files
    assertThat(logTester.logs(LoggerLevel.WARN)).contains("CSS rules were not executed. Failed to start server (1s timeout)");
  }

  @Test
  public void should_fail_fast_when_bridge_server_receives_invalid_response() {
    context.settings().setProperty("sonar.internal.analysis.failFast", "true");
    addInputFile("invalid-json-response.css");

    assertThatThrownBy(() -> sensor.execute(context))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("Analysis failed");
  }

  @Test
  public void should_not_analyze_files_with_not_file_uri() throws URISyntaxException, IOException {
    InputFile httpFile = mock(InputFile.class);
    when(httpFile.filename()).thenReturn("file.css");
    when(httpFile.uri()).thenReturn(new URI("http://lost-on-earth.com/file.css"));
    sensor.analyzeFile(context, httpFile, new File("config.json"));
    assertThat(String.join("\n", logTester.logs(LoggerLevel.DEBUG)))
      .matches("(?s).*Skipping \\S*file.css as it has not 'file' scheme.*")
      .doesNotMatch("(?s).*\nAnalyzing \\S*file.css.*");
  }

  @Test
  public void analysis_stop_when_server_is_not_anymore_alive() {
    File configFile = new File("config.json");
    DefaultInputFile inputFile = addInputFile("dir/file.css");
    sensor.execute(context);
    cssAnalyzerBridgeServer.setPort(43);

    assertThatThrownBy(() -> sensor.analyzeFileWithContextCheck(inputFile, context, configFile))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("css-bundle server is not answering");
  }

  @Test
  public void should_stop_execution_when_sensor_context_is_cancelled() throws IOException {
    addInputFile("file.css");
    context.setCancelled(true);
    sensor.execute(context);
    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(LoggerLevel.INFO))
      .contains("java.util.concurrent.CancellationException: Analysis interrupted because the SensorContext is in cancelled state");
  }

  @Test
  public void test_old_property_is_provided() {
    context.settings().setProperty(CssPlugin.FORMER_NODE_EXECUTABLE, "foo");
    addInputFile("file.css");
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.WARN)).contains("Property 'sonar.css.node' is ignored, 'sonar.nodejs.executable' should be used instead");
    verify(analysisWarnings).addUnique(eq("Property 'sonar.css.node' is ignored, 'sonar.nodejs.executable' should be used instead"));

    assertThat(context.allIssues()).hasSize(1);

    sensor = new CssRuleSensor(CHECK_FACTORY, cssAnalyzerBridgeServer, null);
    sensor.execute(context);
    verifyNoMoreInteractions(analysisWarnings);
  }

  @Test
  public void test_syntax_error() {
    InputFile inputFile = addInputFile("syntax-error.css");
    InputFile inputFileNotCss = addInputFile("syntax-error.web");
    sensor.execute(context);
    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to parse " + inputFile.uri() + ", line 2, Missed semicolon");
    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Failed to parse " + inputFileNotCss.uri() + ", line 2, Missed semicolon");
  }

  @Test
  public void test_unknown_rule() {
    addInputFile("unknown-rule.css");
    sensor.execute(context);

    assertThat(context.allIssues()).isEmpty();
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Unknown stylelint rule or rule not enabled: 'unknown-rule-key'");
  }

  @Test
  public void should_not_send_file_content_if_encoding_is_utf8_and_context_is_not_sonarlint() throws IOException {
    String filePath = "copy-file-content-into-issue-message.css";
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", filePath)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("css content")
      .build();
    context.fileSystem().add(inputFile);
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);
    assertThat(context.allIssues()).extracting("primaryLocation.message")
      .containsOnly("undefined");
  }

  @Test
  public void should_send_file_content_if_encoding_is_not_utf8() throws IOException {
    String filePath = "copy-file-content-into-issue-message.css";
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", filePath)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.ISO_8859_1)
      .setContents("css content")
      .build();
    context.fileSystem().add(inputFile);
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);
    assertThat(context.allIssues()).extracting("primaryLocation.message")
      .containsOnly("css content");
  }

  @Test
  public void should_send_file_content_if_context_is_sonarlint() throws IOException {
    String filePath = "copy-file-content-into-issue-message.css";
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", filePath)
      .setLanguage(CssLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("css content")
      .build();
    context.fileSystem().add(inputFile);
    context.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(7, 9)));
    sensor.execute(context);
    assertThat(context.allIssues()).hasSize(1);
    assertThat(context.allIssues()).extracting("primaryLocation.message")
      .containsOnly("css content");
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

}
