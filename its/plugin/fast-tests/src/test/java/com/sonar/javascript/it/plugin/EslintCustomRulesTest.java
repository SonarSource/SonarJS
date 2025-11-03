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

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.io.File;
import java.nio.file.Path;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import shadow.com.sonar.orchestrator.locator.FileLocation;

class EslintCustomRulesTest {

  private static final String PLUGIN_ARTIFACT_ID = "eslint-custom-rules-plugin";

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestMasterBuild())
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withPlugin(
      FileLocation.byWildcardMavenFilename(
        new File("../plugins/" + PLUGIN_ARTIFACT_ID + "/target"),
        PLUGIN_ARTIFACT_ID + "-*.jar"
      )
    )
    .withLanguage(
      JavaScriptLanguage.KEY,
      "JAVASCRIPT",
      JavaScriptLanguage.FILE_SUFFIXES_KEY,
      JavaScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withLanguage(
      TypeScriptLanguage.KEY,
      "TYPESCRIPT",
      TypeScriptLanguage.FILE_SUFFIXES_KEY,
      TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withActiveRules(
      loadActiveRulesFromXmlProfile(
        Path.of("src", "test", "resources", "profile-javascript-custom-rules.xml")
      )
    )
    .withActiveRules(
      loadActiveRulesFromXmlProfile(
        Path.of("src", "test", "resources", "profile-typescript-custom-rules.xml")
      )
    )
    .build();

  @Test
  void test() {
    var build = ScannerInput.create("custom-rules", TestUtils.projectDirNoCopy("custom_rules"))
      .withVerbose()
      .withScmDisabled()
      .withSourceDirs("src")
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);
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
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .toList();
    var eslintCustomRuleIssues = issues
      .stream()
      .filter(issue -> issue.ruleKey().equals("eslint-custom-rules:sqKey"))
      .toList();

    assertThat(eslintCustomRuleIssues).hasSize(2);
    assertThat(eslintCustomRuleIssues)
      .extracting(
        ScannerOutputReader.TextRangeIssue::ruleKey,
        ScannerOutputReader.TextRangeIssue::componentPath,
        ScannerOutputReader.TextRangeIssue::line,
        ScannerOutputReader.TextRangeIssue::message
      )
      .containsExactlyInAnyOrder(
        new Tuple("js-custom-rules:jsRuleKey", "src/dir/Person.js", 21, "jsRuleKey call"),
        new Tuple("js-custom-rules:jsRuleKey", "src/dir/file.ts", 4, "jsRuleKey call")
      );
    var tsEslintCustomRuleIssues = issues
      .stream()
      .filter(issue -> issue.ruleKey().equals("ts-custom-rules:tsRuleKey"))
      .toList();
    assertThat(tsEslintCustomRuleIssues)
      .extracting(
        ScannerOutputReader.TextRangeIssue::ruleKey,
        ScannerOutputReader.TextRangeIssue::componentPath,
        ScannerOutputReader.TextRangeIssue::line,
        ScannerOutputReader.TextRangeIssue::message
      )
      .containsExactlyInAnyOrder(
        new Tuple("ts-custom-rules:tsRuleKey", "src/dir/file.ts", 4, "tsRuleKey call")
      );
  }
}
