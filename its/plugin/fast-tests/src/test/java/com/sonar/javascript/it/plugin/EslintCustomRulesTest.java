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

import com.sonar.orchestrator.locator.FileLocation;
import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.io.File;
import java.nio.file.Path;
import java.util.List;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class EslintCustomRulesTest {

  private static final String PLUGIN_ARTIFACT_ID = "eslint-custom-rules-plugin";

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY),
    List.of(
      FileLocation.byWildcardMavenFilename(
        new File("../plugins/" + PLUGIN_ARTIFACT_ID + "/target"),
        PLUGIN_ARTIFACT_ID + "-*.jar"
      ),
      SonarScannerIntegrationHelper.getJavascriptPlugin()
    ),
    List.of(
      Path.of("src", "test", "resources", "profile-javascript-custom-rules.xml"),
      Path.of("src", "test", "resources", "profile-typescript-custom-rules.xml")
    )
  );

  @Test
  void test() {
    var build = ScannerInput.create("custom-rules", TestUtils.projectDirNoCopy("custom_rules"))
      .withVerbose()
      .withScmDisabled()
      .withSourceDirs("src")
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());
    assertThat(result.logOutput())
      .filteredOn(
        l ->
          l.level().equals(Log.Level.DEBUG) &&
          l
            .message()
            .matches(
              "Deploying custom rules bundle jar:file:.*/custom-eslint-based-rules-1\\.0\\.0\\.tgz to .*"
            )
      )
      .hasSize(1);

    assertThat(result.logOutput())
      .filteredOn(
        l -> l.level().equals(Log.Level.INFO) && l.message().contains("Work dir received:")
      )
      .hasSize(2);
    assertThat(result.logOutput())
      .filteredOn(l -> l.message().contains("Rule context options:"))
      .hasSize(2);

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    var eslintCustomRuleIssues = issues
      .stream()
      .filter(issue -> issue.ruleKey().equals("js-custom-rules:jsRuleKey"))
      .toList();

    assertThat(eslintCustomRuleIssues).hasSize(1);
    assertThat(eslintCustomRuleIssues)
      .extracting(
        TextRangeIssue::ruleKey,
        TextRangeIssue::componentPath,
        TextRangeIssue::line,
        TextRangeIssue::message
      )
      .containsExactlyInAnyOrder(
        new Tuple("js-custom-rules:jsRuleKey", "src/dir/Person.js", 21, "jsRuleKey call")
      );
    var tsEslintCustomRuleIssues = issues
      .stream()
      .filter(issue -> issue.ruleKey().equals("ts-custom-rules:tsRuleKey"))
      .toList();
    assertThat(tsEslintCustomRuleIssues)
      .extracting(
        TextRangeIssue::ruleKey,
        TextRangeIssue::componentPath,
        TextRangeIssue::line,
        TextRangeIssue::message
      )
      .containsExactlyInAnyOrder(
        new Tuple("ts-custom-rules:tsRuleKey", "src/dir/file.ts", 4, "tsRuleKey call")
      );
  }
}
