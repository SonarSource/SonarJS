/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import java.io.IOException;
import java.util.Iterator;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.DefaultTextPointer;
import org.sonar.api.batch.fs.internal.DefaultTextRange;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.batch.sensor.issue.IssueLocation;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.internal.JUnitTempFolder;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.eslint.EslintBasedRulesSensor.AnalysisRequest;
import org.sonarsource.nodejs.NodeCommandException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class EslintBasedRulesSensorTest {

  private static final String ESLINT_BASED_RULE = "S3923";

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @Mock
  private EslintBridgeServer eslintBridgeServerMock;

  @Rule
  public final ExpectedException thrown = ExpectedException.none();

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();
  private SensorContextTester context;

  @Before
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);
    when(eslintBridgeServerMock.call(any())).thenReturn("[]");
    when(eslintBridgeServerMock.getCommandInfo()).thenReturn("eslintBridgeServerMock command info");
    context = SensorContextTester.create(tempFolder.newDir());
  }

  @Test
  public void should_create_issues_from_eslint_based_rules() throws Exception {
    when(eslintBridgeServerMock.call(any())).thenReturn("[{" +
      "\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", \"secondaryLocations\": []}," +
      "{\"line\":1,\"column\":1,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Line issue message\", \"secondaryLocations\": []" +
      "}]");

    EslintBasedRulesSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);

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
  }


  @Test
  public void should_report_secondary_issue_locations_from_eslint_based_rules() throws Exception {
    when(eslintBridgeServerMock.call(any())).thenReturn(
      "[{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", " +
        "\"cost\": 14," +
        "\"secondaryLocations\": [" +
        "{ message: \"Secondary\", \"line\":2,\"column\":0,\"endLine\":2,\"endColumn\":3}," +
        "{ message: \"Secondary\", \"line\":3,\"column\":1,\"endLine\":3,\"endColumn\":4}" +
        "]}]");

    EslintBasedRulesSensor sensor = createSensor();
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
    assertThat(secondary1.textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(2, 0), new DefaultTextPointer(2, 3)));

    IssueLocation secondary2 = issue.flows().get(1).locations().get(0);
    assertThat(secondary2.inputComponent()).isEqualTo(inputFile);
    assertThat(secondary2.message()).isEqualTo("Secondary");
    assertThat(secondary2.textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(3, 1), new DefaultTextPointer(3, 4)));
  }

  @Test
  public void should_not_report_secondary_when_location_are_null() throws Exception {
    when(eslintBridgeServerMock.call(any())).thenReturn(
      "[{\"line\":1,\"column\":3,\"endLine\":3,\"endColumn\":5,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", " +
        "\"secondaryLocations\": [" +
        "{ message: \"Secondary\", \"line\":2,\"column\":1,\"endLine\":null,\"endColumn\":4}" +
        "]}]");

    EslintBasedRulesSensor sensor = createSensor();
    createInputFile(context);
    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    assertThat(issue.flows()).hasSize(0);
  }

  @Test
  public void should_report_cost_from_eslint_based_rules() throws Exception {
    when(eslintBridgeServerMock.call(any())).thenReturn(
      "[{\"line\":1,\"column\":2,\"endLine\":3,\"endColumn\":4,\"ruleId\":\"no-all-duplicated-branches\",\"message\":\"Issue message\", " +
        "\"cost\": 42," + "\"secondaryLocations\": []}]");

    EslintBasedRulesSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);

    sensor.execute(context);

    assertThat(context.allIssues()).hasSize(1);

    Iterator<Issue> issues = context.allIssues().iterator();
    Issue issue = issues.next();

    IssueLocation location = issue.primaryLocation();
    assertThat(location.inputComponent()).isEqualTo(inputFile);
    assertThat(location.message()).isEqualTo("Issue message");
    assertThat(location.textRange()).isEqualTo(new DefaultTextRange(new DefaultTextPointer(1, 2), new DefaultTextPointer(3, 4)));

    assertThat(issue.gap()).isEqualTo(42);
    assertThat(issue.flows()).hasSize(0);
  }

  @Test
  public void should_do_nothing_if_no_eslint_based_rules_activated() throws Exception {
    EslintBasedRulesSensor sensor = new EslintBasedRulesSensor(
      checkFactory("S2589"),
      eslintBridgeServerMock);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Skipping execution of eslint-based rules because none of them are activated");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_catch_if_bridge_server_not_started() throws Exception {
    doThrow(new IllegalStateException("failed to start server")).when(eslintBridgeServerMock).startServerLazily(context);

    EslintBasedRulesSensor sensor = createSensor();
    createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failure during analysis, eslintBridgeServerMock command info");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_not_explode_if_bad_json_response() throws Exception {
    when(eslintBridgeServerMock.call(any())).thenReturn("Invalid response");
    EslintBasedRulesSensor sensor = createSensor();

    createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR).get(0)).startsWith("Failed to parse: \n" +
      "-----\n" +
      "Invalid response\n" +
      "-----\n");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_not_explode_if_no_response() throws Exception {
    when(eslintBridgeServerMock.call(any())).thenThrow(new IOException("error"));
    EslintBasedRulesSensor sensor = createSensor();
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to get response while analyzing " + inputFile.uri());
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor().describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("ESLint-based SonarJS");
    assertThat(descriptor.languages()).containsOnly("js");
    assertThat(descriptor.type()).isEqualTo(Type.MAIN);
  }

  @Test
  public void should_cut_shebang_in_request() throws Exception {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "dir/file.js")
      .setLanguage("js")
      .setContents("#!/usr/local/bin/node\nlet x = 0;")
      .build();
    AnalysisRequest request = new AnalysisRequest(inputFile, new EslintBasedRulesSensor.Rule[0]);

    assertThat(request.fileContent).isEqualTo("\nlet x = 0;");
  }

  @Test
  public void should_have_configured_rules() throws Exception {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    builder.create(RuleKey.of(CheckList.REPOSITORY_KEY, "S1192")).activate();// no-duplicate-string, default config
    builder.create(RuleKey.of(CheckList.REPOSITORY_KEY, "S1479")).setParam("maximum", "42").activate();// max-switch-cases
    builder.create(RuleKey.of(CheckList.REPOSITORY_KEY, "S3923")).activate();// no-all-duplicated-branches, without config
    CheckFactory checkFactory = new CheckFactory(builder.build());

    EslintBasedRulesSensor sensor = new EslintBasedRulesSensor(
      checkFactory,
      eslintBridgeServerMock);

    EslintBasedRulesSensor.Rule[] rules = sensor.rules;

    assertThat(rules).hasSize(3);

    assertThat(rules[0].key).isEqualTo("no-duplicate-string");
    assertThat(rules[0].configurations).containsExactly("3");

    assertThat(rules[1].key).isEqualTo("max-switch-cases");
    assertThat(rules[1].configurations).containsExactly("42");

    assertThat(rules[2].key).isEqualTo("no-all-duplicated-branches");
    assertThat(rules[2].configurations).isEmpty();
  }

  @Test
  public void should_skip_vue() throws Exception {
    DefaultInputFile flowFile = new TestInputFileBuilder("moduleKey", "dir/file.js")
      .setLanguage("js")
      .setContents("// @flow\nlet x = 0;")
      .build();

    DefaultInputFile vueFile = new TestInputFileBuilder("moduleKey", "dir/file.vue")
      .setLanguage("js")
      .setContents("<script>let x = 0;</script>")
      .build();

    EslintBasedRulesSensor sensor = createSensor();
    context.fileSystem().add(flowFile);
    context.fileSystem().add(vueFile);

    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.DEBUG)).containsOnly("Skipping analysis of Vue.js file " + vueFile.uri());
  }

  @Test
  public void should_detect_unknown_rule_key() throws Exception {
    EslintBasedRulesSensor sensor = createSensor();
    assertThat(sensor.ruleKey("no-all-duplicated-branches")).contains(RuleKey.of("javascript", "S3923"));
    assertThat(sensor.ruleKey("unknown-rule-key")).isEmpty();
  }

  @Test
  public void handle_missing_node() throws Exception {
    doThrow(new NodeCommandException("Exception Message", new IOException())).when(eslintBridgeServerMock).startServerLazily(any());
    AnalysisWarningsWrapper analysisWarnings = mock(AnalysisWarningsWrapper.class);
    EslintBasedRulesSensor eslintBasedRulesSensor = new EslintBasedRulesSensor(checkFactory(ESLINT_BASED_RULE), eslintBridgeServerMock, analysisWarnings);
    eslintBasedRulesSensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Exception Message");
    verify(analysisWarnings).addUnique("Some JavaScript rules were not executed. Exception Message");
  }

  @Test
  public void log_debug_if_already_failed_server() throws Exception {
    doThrow(new ServerAlreadyFailedException()).when(eslintBridgeServerMock).startServerLazily(any());
    EslintBasedRulesSensor eslintBasedRulesSensor = new EslintBasedRulesSensor(checkFactory(ESLINT_BASED_RULE), eslintBridgeServerMock);
    eslintBasedRulesSensor.execute(context);

    assertThat(logTester.logs()).containsExactly("Skipping start of eslint-bridge server due to the failure during first analysis",
      "Skipping execution of eslint-based rules due to the problems with eslint-bridge server");
  }

  private static CheckFactory checkFactory(String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.create(RuleKey.of(CheckList.REPOSITORY_KEY, ruleKey)).activate();
    }
    return new CheckFactory(builder.build());
  }

  private static DefaultInputFile createInputFile(SensorContextTester context) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "dir/file.js")
      .setLanguage("js")
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }


  private EslintBasedRulesSensor createSensor() {
    return new EslintBasedRulesSensor(checkFactory(ESLINT_BASED_RULE), eslintBridgeServerMock);
  }
}
