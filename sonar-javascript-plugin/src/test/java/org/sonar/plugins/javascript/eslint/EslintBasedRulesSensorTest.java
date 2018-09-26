/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import java.io.File;
import java.io.IOException;
import java.util.Iterator;
import org.junit.Before;
import org.junit.Test;
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
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.javascript.checks.CheckList;
import org.sonarsource.nodejs.MockCommandBuilder;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

public class EslintBasedRulesSensorTest {

  private static final File BASE_DIR = new File("src/test/resources");
  private static final String ESLINT_BASED_RULE = "S3923";

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @Mock
  EslintBridgeServer eslintBridgeServerMock;

  @Before
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);
    when(eslintBridgeServerMock.call(any())).thenReturn("[]");
  }

  @Test
  public void should_create_issues_from_eslint_based_rules() throws Exception {
    EslintBasedRulesSensor sensor = createSensor(createEslintBridgeServer("startServer.js"));
    SensorContextTester context = SensorContextTester.create(BASE_DIR);
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
  public void should_do_nothing_if_no_eslint_based_rules_activated() throws Exception {
    EslintBasedRulesSensor sensor = new EslintBasedRulesSensor(
      checkFactory("S2589"),
      eslintBridgeServerMock);
    SensorContextTester context = SensorContextTester.create(BASE_DIR);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("Skipping execution of eslint-based rules because none of them are activated");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_not_explode_if_bridge_server_not_started() throws Exception {
    doThrow(new IllegalStateException("Timeout error: failed to start server")).when(eslintBridgeServerMock).start();

    EslintBasedRulesSensor sensor = createSensor(eslintBridgeServerMock);
    SensorContextTester context = SensorContextTester.create(BASE_DIR);
    createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Timeout error: failed to start server");
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_log_process_streams() throws Exception {
    EslintBasedRulesSensor sensor = createSensor(createEslintBridgeServer("logging.js"));
    SensorContextTester context = SensorContextTester.create(BASE_DIR);
    sensor.execute(context);

    await().untilAsserted(() -> {
      assertThat(logTester.logs(LoggerLevel.DEBUG)).contains("starting server");
      assertThat(logTester.logs(LoggerLevel.INFO)).contains("server is started");
      assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Something wrong happened");
      assertThat(context.allIssues()).isEmpty();
    });
  }

  @Test
  public void should_not_explode_if_failed_to_start_process() throws Exception {
    MockCommandBuilder nodeCommandBuilder = new MockCommandBuilder("", "", 1)
      .throwOnStart(new NodeCommandException("Error starting"));
    EslintBasedRulesSensor sensor = createSensor(new EslintBridgeServerImpl(nodeCommandBuilder, 1, null));
    SensorContextTester context = SensorContextTester.create(BASE_DIR);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR).stream()
      .anyMatch(log -> log.startsWith("Failure during analysis: EslintBridgeServerImpl{nodeCommand=mock-node mock-command}")
      )).isTrue();

    assertThat(context.allIssues()).isEmpty();
  }


  @Test
  public void should_not_explode_if_bad_json_response() throws Exception {
    when(eslintBridgeServerMock.call(any())).thenReturn("Invalid response");
    EslintBasedRulesSensor sensor = createSensor(eslintBridgeServerMock);

    SensorContextTester context = SensorContextTester.create(BASE_DIR);
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
    EslintBasedRulesSensor sensor = createSensor(eslintBridgeServerMock);
    SensorContextTester context = SensorContextTester.create(BASE_DIR);
    DefaultInputFile inputFile = createInputFile(context);
    sensor.execute(context);

    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("Failed to get response while analyzing " + inputFile.uri());
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_have_descriptor() throws Exception {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    createSensor(eslintBridgeServerMock).describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("SonarJS ESLint-based rules execution");
    assertThat(descriptor.languages()).containsOnly("js");
    assertThat(descriptor.type()).isEqualTo(Type.MAIN);
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


  private static EslintBasedRulesSensor createSensor(EslintBridgeServer eslintBridgeServer) {
    return new EslintBasedRulesSensor(checkFactory(ESLINT_BASED_RULE), eslintBridgeServer);
  }

  private static EslintBridgeServerImpl createEslintBridgeServer(String startServerScript) {
    String script = "src/test/resources/eslint-bridge/" + startServerScript;
    return new EslintBridgeServerImpl(NodeCommand.builder(), 1, script);
  }
}
