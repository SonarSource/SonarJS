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
package org.sonar.plugins.javascript.yaml;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Iterator;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.batch.sensor.issue.IssueLocation;
import org.sonar.api.batch.sensor.issue.internal.DefaultNoSonarFilter;
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
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.eslint.AnalysisProcessor;
import org.sonar.plugins.javascript.eslint.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.JavaScriptChecks;
import org.sonar.plugins.javascript.eslint.Monitoring;
import org.sonar.plugins.javascript.eslint.YamlSensor;

import com.google.gson.Gson;

public class YamlSensorTest {
  
  private static final String DUPLICATE_BRANCH_RULE_KEY = "S3923";
  private static final String PARSING_ERROR_RULE_KEY = "S2260";

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

  @BeforeEach
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);
    when(eslintBridgeServerMock.isAlive()).thenReturn(true);
    when(eslintBridgeServerMock.analyzeYaml(any())).thenReturn(new AnalysisResponse());
    when(eslintBridgeServerMock.getCommandInfo()).thenReturn("eslintBridgeServerMock command info");
    context = SensorContextTester.create(baseDir);
    context.fileSystem().setWorkDir(workDir);
    context.setRuntime(SonarRuntimeImpl.forSonarQube(Version.create(9, 3), SonarQubeSide.SCANNER, SonarEdition.COMMUNITY));
    tempFolder = new DefaultTempFolder(tempDir, true);

    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(InputFile.class))).thenReturn(fileLinesContext);
    analysisProcessor = new AnalysisProcessor(new DefaultNoSonarFilter(), fileLinesContextFactory, monitoring);
  }

  @Test
  void should_create_issues() throws Exception {
    AnalysisResponse responseIssues = response("{ issues: [{" +
      "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []}," +
      "{\"line\":1,\"column\":1,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Line issue message\", \"secondaryLocations\": []}" +
      "]}");
    when(eslintBridgeServerMock.analyzeYaml(any())).thenReturn(responseIssues);

    YamlSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);
    verify(eslintBridgeServerMock, times(1)).initLinter(any(), any(), any());
    assertThat(context.allIssues()).hasSize(2);

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
    assertThat(logTester.logs(LoggerLevel.WARN)).doesNotContain("Custom JavaScript rules are deprecated and API will be removed in future version.");
  }

  @Test
  void should_raise_a_parsing_error() throws IOException {
    when(eslintBridgeServerMock.analyzeYaml(any()))
      .thenReturn(new Gson().fromJson("{ parsingError: { line: 1, message: \"Parse error message\", code: \"Parsing\"} }", AnalysisResponse.class));
    createInputFile(context);
    createSensor().execute(context);
    Collection<Issue> issues = context.allIssues();
    assertThat(issues).hasSize(1);
    Issue issue = issues.iterator().next();
    assertThat(issue.primaryLocation().textRange().start().line()).isEqualTo(1);
    assertThat(issue.primaryLocation().message()).isEqualTo("Parse error message");
    assertThat(context.allAnalysisErrors()).hasSize(1);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to parse file [dir/file.yaml] at line 1: Parse error message");
  }

  private static JavaScriptChecks checks(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(CheckList.JS_REPOSITORY_KEY, ruleKey)).build());
    }
    return new JavaScriptChecks(new CheckFactory(builder.build()));
  }

  private static DefaultInputFile createInputFile(SensorContextTester context) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "dir/file.yaml")
      .setLanguage(YamlLanguage.KEY)
      .setCharset(StandardCharsets.UTF_8)
      .setContents("myJsCode: if (cond) doFoo(); else doFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private YamlSensor createSensor() {
    return new YamlSensor(checks(DUPLICATE_BRANCH_RULE_KEY, PARSING_ERROR_RULE_KEY), eslintBridgeServerMock, new AnalysisWarningsWrapper(), monitoring, analysisProcessor);
  }

  private AnalysisResponse response(String json) {
    return new Gson().fromJson(json, AnalysisResponse.class);
  }
}
