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
import com.sonar.orchestrator.build.SonarScanner;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.client.issues.SearchRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static com.sonar.javascript.it.plugin.CssTests.newWsClient;

public class CssNoCssFileProjectTest {

  private static String PROJECT_KEY = "css-php-project";

  @ClassRule
  public static Orchestrator orchestrator = CssTests.ORCHESTRATOR;

  @BeforeClass
  public static void prepare() {
    orchestrator.getServer().provisionProject(PROJECT_KEY, PROJECT_KEY);
    SonarScanner scanner = CssTests.createScanner(PROJECT_KEY);
    orchestrator.executeBuild(scanner);
  }

  @Test
  public void test() {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(Collections.singletonList(PROJECT_KEY));
    List<Issues.Issue> issuesList = newWsClient().issues().search(request).getIssuesList().stream()
      .filter(i -> i.getRule().startsWith("css:"))
      .collect(Collectors.toList());

    assertThat(issuesList).extracting(Issues.Issue::getRule, Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple("css:S4658", 7, "css-php-project:src/index.php"));

  }

}
