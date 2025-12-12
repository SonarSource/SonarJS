/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
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
package com.sonar.javascript.it.plugin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRange;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class HtmlAnalysisTest {

  private SonarServerContext getServerContext(List<Path> profiles) {
    return SonarScannerIntegrationHelper.getContext(
      List.of("web"),
      List.of(
        SonarScannerIntegrationHelper.getJavascriptPlugin(),
        SonarScannerIntegrationHelper.getHtmlPlugin()
      ),
      profiles
    );
  }

  @Test
  void should_raise_issues_in_html_files() {
    var projectKey = "html-project";
    var uniqueProjectKey = projectKey + UUID.randomUUID();

    var build = ScannerInput.create(uniqueProjectKey, TestUtils.projectDir(projectKey))
      .withScmDisabled()
      .build();

    var serverContext = getServerContext(
      List.of(
        Path.of("src", "test", "resources", "html-profile.xml"),
        Path.of("src", "test", "resources", "eslint-based-rules.xml")
      )
    );
    var result = ScannerRunner.run(serverContext, build, ScannerRunnerConfig.builder().build());
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();

    assertThat(issues).hasSize(3);
    var issue = issues.get(2);
    assertThat(issue.range()).isEqualTo(new TextRange(7, 7, 19, 25));
    assertThat(issues)
      .extracting(TextRangeIssue::line, TextRangeIssue::ruleKey)
      .containsExactlyInAnyOrder(
        tuple(1, "Web:DoctypePresenceCheck"),
        tuple(4, "javascript:S3923"),
        tuple(7, "javascript:S3834")
      );
  }

  @Test
  void should_not_raise_issues_for_blacklisted_rules() {
    var projectKey = "html-project-blacklisted-rules";
    var build = ScannerInput.create(projectKey, TestUtils.projectDir(projectKey))
      .withScmDisabled()
      .build();

    var serverContext = getServerContext(
      List.of(
        Path.of("src", "test", "resources", "html-blacklist-profile.xml"),
        Path.of("src", "test", "resources", "html-profile.xml")
      )
    );
    var result = ScannerRunner.run(serverContext, build, ScannerRunnerConfig.builder().build());
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();

    assertThat(issues)
      .extracting(TextRangeIssue::line, TextRangeIssue::ruleKey)
      .containsExactlyInAnyOrder(
        tuple(1, "Web:DoctypePresenceCheck"),
        tuple(4, "javascript:S3923")
      );
  }
}
