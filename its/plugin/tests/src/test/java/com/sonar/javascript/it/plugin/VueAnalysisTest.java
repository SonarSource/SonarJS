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
import java.io.File;
import java.util.List;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.Tests.getIssues;
import static org.assertj.core.api.Assertions.assertThat;

public class VueAnalysisTest {

  @ClassRule
  public static final Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("vue-js-project");

  @Test
  public void test() {
    String projectKey = "vue-js-project";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    Tests.setProfile(projectKey, "eslint-based-rules-profile", "js");
    orchestrator.executeBuild(build);

    List<Issues.Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(6);

    assertThat(Tests.getMeasureAsInt(projectKey, "ncloc")).isEqualTo(7);
    assertThat(Tests.getMeasureAsInt(projectKey, "classes")).isEqualTo(0);
    assertThat(Tests.getMeasureAsInt(projectKey, "functions")).isEqualTo(0);
    assertThat(Tests.getMeasureAsInt(projectKey, "statements")).isEqualTo(3);
    assertThat(Tests.getMeasureAsInt(projectKey, "comment_lines")).isEqualTo(0);
    assertThat(Tests.getMeasureAsInt(projectKey, "complexity")).isEqualTo(1);
    assertThat(Tests.getMeasureAsInt(projectKey, "cognitive_complexity")).isEqualTo(2);
  }
}
