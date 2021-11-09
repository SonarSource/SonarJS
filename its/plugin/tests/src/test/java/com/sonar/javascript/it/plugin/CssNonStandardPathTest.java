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
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;
import org.sonarsource.analyzer.commons.ProfileGenerator;
import org.sonarsource.analyzer.commons.ProfileGenerator.RulesConfiguration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static com.sonar.javascript.it.plugin.CssTests.newWsClient;

public class CssNonStandardPathTest {

  private static String PROJECT_KEY = "css-dir-with-paren";

  @ClassRule
  public static Orchestrator orchestrator = CssTests.ORCHESTRATOR;

  @BeforeClass
  public static void prepare() {
    RulesConfiguration rulesConfiguration = new RulesConfiguration();
    File profile = ProfileGenerator.generateProfile(orchestrator.getServer().getUrl(), "css", "css", rulesConfiguration, Collections.emptySet());
    orchestrator.getServer().restoreProfile(FileLocation.of(profile));

    orchestrator.getServer().provisionProject(PROJECT_KEY, PROJECT_KEY);
    orchestrator.getServer().associateProjectToQualityProfile(PROJECT_KEY, "css", "rules");

    File projectDir = FileLocation.of("projects" + File.separator + "css-(dir with paren)").getFile();
    SonarScanner scanner = CssTests.createScanner(PROJECT_KEY, projectDir);
    orchestrator.executeBuild(scanner);
  }

  @Test
  public void test() {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(Collections.singletonList(PROJECT_KEY));
    List<Issue> issuesList = newWsClient().issues().search(request).getIssuesList().stream()
      .filter(i -> i.getRule().startsWith("css:"))
      .collect(Collectors.toList());

    assertThat(issuesList).extracting(Issue::getRule, Issue::getComponent).containsExactly(
      tuple("css:S1128", "css-dir-with-paren:src/file1.css")
    );
  }

}
