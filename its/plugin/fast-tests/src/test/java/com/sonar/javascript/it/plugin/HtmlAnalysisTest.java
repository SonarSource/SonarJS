/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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

import static com.sonarsource.scanner.integrationtester.utility.QualityProfileLoader.loadActiveRulesFromXmlProfile;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class HtmlAnalysisTest {

  private SonarServerContext getServerContext(List<String> profiles) {
    var result = SonarServerContext.builder()
      .withProduct(SonarServerContext.Product.SERVER)
      .withEngineVersion(EngineVersion.latestMasterBuild())
      .withLanguage("web", "HTML", "sonar.html.file.suffixes", ".html")
      .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
      .withPlugin(SonarScannerIntegrationHelper.getHtmlPlugin());
    for (var profile : profiles) {
      result.withActiveRules(
        loadActiveRulesFromXmlProfile(Path.of("src", "test", "resources", profile))
      );
    }
    return result.build();
  }

  @Test
  void should_raise_issues_in_html_files() {
    var projectKey = "html-project";
    var uniqueProjectKey = projectKey + UUID.randomUUID();

    var build = ScannerInput.create(uniqueProjectKey, TestUtils.projectDir(projectKey))
      .withScmDisabled()
      .build();

    var serverContext = getServerContext(List.of("html-profile.xml", "eslint-based-rules.xml"));
    var result = ScannerRunner.run(serverContext, build);
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .toList();

    assertThat(issues).hasSize(3);
    var issue = issues.get(2);
    assertThat(issue.range()).isEqualTo(new ScannerOutputReader.TextRange(7, 7, 19, 25));
    assertThat(issues)
      .extracting(
        ScannerOutputReader.TextRangeIssue::line,
        ScannerOutputReader.TextRangeIssue::ruleKey
      )
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

    var serverContext = getServerContext(List.of("html-blacklist-profile.xml", "html-profile.xml"));
    var result = ScannerRunner.run(serverContext, build);
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .toList();

    assertThat(issues)
      .extracting(
        ScannerOutputReader.TextRangeIssue::line,
        ScannerOutputReader.TextRangeIssue::ruleKey
      )
      .containsExactlyInAnyOrder(
        tuple(1, "Web:DoctypePresenceCheck"),
        tuple(4, "javascript:S3923")
      );
  }
}
