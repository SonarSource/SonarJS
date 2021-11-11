/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2021 SonarSource SA
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

import com.sonar.orchestrator.Orchestrator;
import java.util.Collections;
import java.util.List;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static com.sonar.javascript.it.plugin.CssTests.newWsClient;

public class CssStylelintReportTest {

  private static String PROJECT_KEY = "external-report-project";

  @ClassRule
  public static Orchestrator orchestrator = CssTests.ORCHESTRATOR;

  @BeforeClass
  public static void prepare() {
    orchestrator.executeBuild(CssTests.createScanner(PROJECT_KEY).setProperty("sonar.css.stylelint.reportPaths", "report.json"));
  }

  @Test
  public void test() {
    if (orchestrator.getServer().version().isGreaterThanOrEquals(7, 2)) {
      SearchRequest request = new SearchRequest();
      request.setComponentKeys(Collections.singletonList(PROJECT_KEY));
      List<Issue> issuesList = newWsClient().issues().search(request).getIssuesList();

      assertThat(issuesList).extracting("line").containsExactlyInAnyOrder(111, 81, 55, 58, 114);
      assertThat(issuesList).extracting("rule").containsExactlyInAnyOrder(
        "external_stylelint:no-missing-end-of-source-newline",
        "external_stylelint:no-missing-end-of-source-newline",
        "external_stylelint:rule-empty-line-before",
        "external_stylelint:selector-pseudo-element-colon-notation",
        "css:S4658");
    }
  }
}
