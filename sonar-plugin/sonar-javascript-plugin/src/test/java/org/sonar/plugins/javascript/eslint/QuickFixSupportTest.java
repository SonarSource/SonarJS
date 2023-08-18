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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.DefaultActiveRules;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.internal.SensorStorage;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.Version;
import org.sonarsource.sonarlint.core.analysis.api.ClientInputFile;
import org.sonarsource.sonarlint.core.analysis.container.analysis.filesystem.SonarLintInputFile;
import org.sonarsource.sonarlint.core.analysis.container.analysis.filesystem.SonarLintInputProject;
import org.sonarsource.sonarlint.core.analysis.sonarapi.DefaultSensorContext;
import org.sonarsource.sonarlint.core.analysis.sonarapi.DefaultSonarLintIssue;
import org.sonarsource.sonarlint.core.commons.progress.ProgressMonitor;
import org.sonarsource.sonarlint.core.plugin.commons.sonarapi.SonarLintRuntimeImpl;

class QuickFixSupportTest {

  @TempDir
  Path baseDir;

  SonarLintInputFile inputFile;
  SensorStorage sensorStorage;
  JsTsChecks checks;
  DefaultActiveRules activeRules;
  AnalysisProcessor analysisProcessor;

  @BeforeEach
  void setUp() {
    var mock = mock(ClientInputFile.class);
    when(mock.relativePath()).thenReturn("file.js");
    inputFile = new SonarLintInputFile(mock, i -> null);
    inputFile.setType(InputFile.Type.MAIN);
    var activeRule = new NewActiveRule.Builder()
      .setRuleKey(RuleKey.of("javascript", "S1116"))
      .build();
    activeRules = new ActiveRulesBuilder().addRule(activeRule).build();
    checks = new JsTsChecks(new CheckFactory(activeRules));
    analysisProcessor =
      new AnalysisProcessor(
        mock(NoSonarFilter.class),
        mock(FileLinesContextFactory.class),
        mock(Monitoring.class)
      );
  }

  DefaultSensorContext createContext(Version version) {
    var settings = new MapSettings();
    var fs = new DefaultFileSystem(baseDir);
    var runtime = new SonarLintRuntimeImpl(Version.create(8, 9), version, 1L);
    sensorStorage = mock(SensorStorage.class);
    return new DefaultSensorContext(
      mock(SonarLintInputProject.class),
      settings,
      settings.asConfig(),
      fs,
      activeRules,
      sensorStorage,
      runtime,
      mock(ProgressMonitor.class)
    );
  }

  @Test
  void test() {
    var context = createContext(Version.create(6, 3));

    var response = new BridgeServer.AnalysisResponse();
    response.issues = List.of(issueWithQuickFix());

    var issueCaptor = ArgumentCaptor.forClass(DefaultSonarLintIssue.class);
    doNothing().when(sensorStorage).store(issueCaptor.capture());
    analysisProcessor.processResponse(context, checks, inputFile, response);

    var sonarLintIssue = issueCaptor.getValue();

    assertThat(sonarLintIssue.quickFixes()).hasSize(1);
    var qf = sonarLintIssue.quickFixes().get(0);
    assertThat(qf.message()).isEqualTo("QuickFix message");
    var textEdit = qf.inputFileEdits().get(0).textEdits().get(0);
    assertThat(textEdit.range())
      .extracting(
        r -> r.start().line(),
        r -> r.start().lineOffset(),
        r -> r.end().line(),
        r -> r.end().lineOffset()
      )
      .containsExactly(1, 2, 3, 4);
  }

  static BridgeServer.Issue issueWithQuickFix() {
    var quickFixEdit = new BridgeServer.QuickFixEdit();
    quickFixEdit.text = ";";
    quickFixEdit.loc = new BridgeServer.IssueLocation();
    quickFixEdit.loc.line = 1;
    quickFixEdit.loc.column = 2;
    quickFixEdit.loc.endLine = 3;
    quickFixEdit.loc.endColumn = 4;
    var quickFix = new BridgeServer.QuickFix();
    quickFix.message = "QuickFix message";
    quickFix.edits = List.of(quickFixEdit);
    var issue = new BridgeServer.Issue();
    issue.ruleId = "no-extra-semi";
    issue.line = 1;
    issue.column = 1;
    issue.endLine = 1;
    issue.endColumn = 1;
    issue.secondaryLocations = List.of();
    issue.quickFixes = List.of(quickFix);
    return issue;
  }

  @Test
  void test_old_version() {
    var context = createContext(Version.create(6, 2));
    var response = new BridgeServer.AnalysisResponse();
    response.issues = List.of(issueWithQuickFix());

    var issueCaptor = ArgumentCaptor.forClass(DefaultSonarLintIssue.class);
    doNothing().when(sensorStorage).store(issueCaptor.capture());
    analysisProcessor.processResponse(context, checks, inputFile, response);

    assertThat(issueCaptor.getValue().quickFixes()).isEmpty();
  }

  @Test
  void test_null() {
    var context = createContext(Version.create(6, 3));
    var issue = issueWithQuickFix();
    issue.quickFixes = null;
    var response = new BridgeServer.AnalysisResponse();
    response.issues = List.of(issue);

    var issueCaptor = ArgumentCaptor.forClass(DefaultSonarLintIssue.class);
    doNothing().when(sensorStorage).store(issueCaptor.capture());
    analysisProcessor.processResponse(context, checks, inputFile, response);

    assertThat(issueCaptor.getValue().quickFixes()).isEmpty();
  }
}
