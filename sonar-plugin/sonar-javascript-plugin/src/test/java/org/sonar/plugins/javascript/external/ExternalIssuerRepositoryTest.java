/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.external;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextPointer;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.rule.Severity;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.issue.NewExternalIssue;
import org.sonar.api.batch.sensor.issue.NewIssueLocation;
import org.sonar.api.rules.RuleType;

public class ExternalIssuerRepositoryTest {

  /**
   * We check that `ExternalIssueRepository.save` call every `NewExternalIssue` method that is required to register an external issue to SonarQube
   */
  @Test
  void external_issue_api_is_used_as_expected() {
    var context = mock(SensorContext.class);
    var newExternalIssue = mock(NewExternalIssue.class);
    var newIssueLocation = mock(NewIssueLocation.class);

    when(newExternalIssue.newLocation()).thenReturn(newIssueLocation);
    when(newExternalIssue.severity(any(Severity.class))).thenReturn(newExternalIssue);
    when(newExternalIssue.remediationEffortMinutes(any(Long.class))).thenReturn(newExternalIssue);
    when(newExternalIssue.at(any(NewIssueLocation.class))).thenReturn(newExternalIssue);
    when(newExternalIssue.engineId(any(String.class))).thenReturn(newExternalIssue);
    when(newExternalIssue.ruleId(any(String.class))).thenReturn(newExternalIssue);
    when(newExternalIssue.type(any(RuleType.class))).thenReturn(newExternalIssue);

    when(context.newExternalIssue()).thenReturn(newExternalIssue);

    var inputFile = mock(InputFile.class);
    var textRange = mock(TextRange.class);

    when(textRange.start()).thenReturn(mock(TextPointer.class));
    when(textRange.end()).thenReturn(mock(TextPointer.class));

    var issue = new Issue(
      "name",
      inputFile,
      textRange,
      RuleType.CODE_SMELL,
      "message",
      Severity.INFO,
      10L,
      "engineId"
    );

    ExternalIssueRepository.save(issue, context);

    // external issue location message
    var messageArgumentCaptor = ArgumentCaptor.forClass(String.class);
    verify(newIssueLocation).message(messageArgumentCaptor.capture());
    assertThat(messageArgumentCaptor.getValue()).isEqualTo("message");

    // external issue severity
    var severityArgumentCaptor = ArgumentCaptor.forClass(Severity.class);
    verify(newExternalIssue).severity(severityArgumentCaptor.capture());
    assertThat(severityArgumentCaptor.getValue()).isEqualTo(Severity.INFO);

    // external issue remediationEffortMinutes
    var remediationEffortMinutesArgumentCaptor = ArgumentCaptor.forClass(Long.class);
    verify(newExternalIssue).remediationEffortMinutes(
      remediationEffortMinutesArgumentCaptor.capture()
    );
    assertThat(remediationEffortMinutesArgumentCaptor.getValue()).isEqualTo(10L);

    // external issue at
    var atArgumentCaptor = ArgumentCaptor.forClass(NewIssueLocation.class);
    verify(newExternalIssue).at(atArgumentCaptor.capture());
    assertThat(atArgumentCaptor.getValue()).isEqualTo(newIssueLocation);

    // external issue engineId
    var engineIdArgumentCaptor = ArgumentCaptor.forClass(String.class);
    verify(newExternalIssue).engineId(engineIdArgumentCaptor.capture());
    assertThat(engineIdArgumentCaptor.getValue()).isEqualTo("engineId");

    // external issue ruleId
    var ruleIdArgumentCaptor = ArgumentCaptor.forClass(String.class);
    verify(newExternalIssue).ruleId(ruleIdArgumentCaptor.capture());
    assertThat(ruleIdArgumentCaptor.getValue()).isEqualTo("name");

    // external issue type
    var ruleTypeArgumentCaptor = ArgumentCaptor.forClass(RuleType.class);
    verify(newExternalIssue).type(ruleTypeArgumentCaptor.capture());
    assertThat(ruleTypeArgumentCaptor.getValue()).isEqualTo(RuleType.CODE_SMELL);

    // external issue save
    verify(newExternalIssue, times(1)).save();
  }
}
