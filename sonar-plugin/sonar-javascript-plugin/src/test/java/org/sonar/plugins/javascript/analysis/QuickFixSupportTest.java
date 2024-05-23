/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

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
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.bridge.BridgeServer.Issue;
import org.sonar.plugins.javascript.bridge.BridgeServer.Metrics;
import org.sonar.plugins.javascript.bridge.BridgeServer.QuickFix;
import org.sonar.plugins.javascript.bridge.BridgeServer.QuickFixEdit;
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
      new AnalysisProcessor(mock(NoSonarFilter.class), mock(FileLinesContextFactory.class));
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

    var response = new AnalysisResponse(null, List.of(issueWithQuickFix()), null, null, null, null, null);

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

  static Issue issueWithQuickFix() {
    var quickFixEdit = new QuickFixEdit(";", new BridgeServer.IssueLocation(1, 2, 3, 4, ""));
    var quickFix = new QuickFix("QuickFix message", List.of(quickFixEdit));
    var issue = new Issue(1, 1, 1, 1,"", "no-extra-semi", List.of(), 1.0, List.of(quickFix));
    return issue;
  }

  @Test
  void test_old_version() {
    var context = createContext(Version.create(6, 2));
    var response = new AnalysisResponse(null, List.of(issueWithQuickFix()), null, null, null, null, null);

    var issueCaptor = ArgumentCaptor.forClass(DefaultSonarLintIssue.class);
    doNothing().when(sensorStorage).store(issueCaptor.capture());
    analysisProcessor.processResponse(context, checks, inputFile, response);

    assertThat(issueCaptor.getValue().quickFixes()).isEmpty();
  }

  @Test
  void test_null() {
    var context = createContext(Version.create(6, 3));
    var issue = new Issue(1, 1, 1, 1,"", "no-extra-semi", List.of(), 1.0, null);
    var response = new AnalysisResponse(null, List.of(issue), null, null, new Metrics(), null, null);

    var issueCaptor = ArgumentCaptor.forClass(DefaultSonarLintIssue.class);
    doNothing().when(sensorStorage).store(issueCaptor.capture());
    analysisProcessor.processResponse(context, checks, inputFile, response);

    assertThat(issueCaptor.getValue().quickFixes()).isEmpty();
  }
}
