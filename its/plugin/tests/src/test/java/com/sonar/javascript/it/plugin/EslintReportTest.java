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
package com.sonar.javascript.it.plugin;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.setEmptyProfile;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

@ExtendWith(OrchestratorStarter.class)
class EslintReportTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final String PROJECT_KEY_PREFIX = "SonarJS-eslint-report-test";
  private static final File PROJECT_DIR = TestUtils.projectDir("eslint_report");

  @Test
  void should_save_issues_from_external_report_with_relative_paths() {
    String projectKey = PROJECT_KEY_PREFIX + "-relative";

    SonarScanner build = OrchestratorStarter
      .createScanner()
      .setProjectDir(PROJECT_DIR)
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs("src");

    setEmptyProfile(projectKey);
    build.setProperty("sonar.eslint.reportPaths", "report.json");
    orchestrator.executeBuild(build);

    assertIssues(projectKey);
  }

  @Test
  void should_save_issues_from_external_report_with_absolute_paths() throws IOException {
    String projectKey = PROJECT_KEY_PREFIX + "-absolute";
    SonarScanner build = OrchestratorStarter
      .createScanner()
      .setProjectDir(PROJECT_DIR)
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs("src");

    setEmptyProfile(projectKey);

    File reportWithRelativePaths = new File(PROJECT_DIR, "report.json");
    File reportWithAbsolutePaths = new File(PROJECT_DIR, "report_absolute_paths.json");
    createReportWithAbsolutePaths(reportWithRelativePaths, reportWithAbsolutePaths);

    build.setProperty("sonar.eslint.reportPaths", reportWithAbsolutePaths.getAbsolutePath());
    orchestrator.executeBuild(build);

    assertIssues(projectKey);

    Files.delete(reportWithAbsolutePaths.toPath());
  }

  private void assertIssues(String projectKey) {
    List<Issue> jsIssuesList = getIssues(projectKey + ":src/file.js");
    List<Issue> tsIssuesList = getIssues(projectKey + ":src/file.ts");

    assertThat(jsIssuesList)
      .extracting(Issue::getLine, Issue::getRule)
      .containsExactlyInAnyOrder(
        tuple(1, "external_eslint_repo:@typescript-eslint/no-unused-vars"),
        tuple(2, "external_eslint_repo:use-isnan"),
        tuple(3, "external_eslint_repo:semi"),
        tuple(5, "external_eslint_repo:semi"),
        tuple(7, "external_eslint_repo:no-extra-semi")
      );

    assertThat(tsIssuesList)
      .extracting(Issue::getLine, Issue::getRule)
      .containsExactlyInAnyOrder(
        tuple(1, "external_eslint_repo:@typescript-eslint/no-unused-vars"),
        tuple(2, "external_eslint_repo:use-isnan"),
        tuple(3, "external_eslint_repo:semi"),
        tuple(5, "external_eslint_repo:semi"),
        tuple(7, "external_eslint_repo:no-extra-semi")
      );
  }

  private void createReportWithAbsolutePaths(
    File reportWithRelativePaths,
    File reportWithAbsolutePaths
  ) throws IOException {
    List<String> reportContent = Files.readAllLines(reportWithRelativePaths.toPath());
    String prefix = "\"filePath\": \"";
    List<String> transformed = reportContent
      .stream()
      .map(s -> {
        if (s.contains(prefix)) {
          File file = new File(PROJECT_DIR, "src/file." + (s.contains(".js") ? "js" : "ts"));
          String absolutePath = file.getAbsolutePath();
          if (System.getProperty("os.name").startsWith("Windows")) {
            // try to "break" file resolution (see https://github.com/SonarSource/SonarJS/issues/1985) by low-casing drive letter
            absolutePath = absolutePath.substring(0, 1).toLowerCase() + absolutePath.substring(1);
            absolutePath = absolutePath.replace("\\", "\\\\");
          }
          return prefix + absolutePath + "\",";
        } else {
          return s;
        }
      })
      .collect(Collectors.toList());
    Files.write(reportWithAbsolutePaths.toPath(), transformed);
  }
}
