/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2020 SonarSource SA
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
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.Tests.getIssues;
import static org.assertj.core.api.Assertions.assertThat;

public class LookupTypeScriptTest {

  @ClassRule
  public static final Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("nested-tsproject");

  @BeforeClass
  public static void startServer() throws Exception {
    orchestrator.resetData();
  }

  @Test
  public void test() throws Exception {
    String projectKey = "nested-tsproject";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR)
      .setDebugLogs(true);

    Tests.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    orchestrator.executeBuild(build);

    List<Issues.Issue> issuesList = getIssues(projectKey + ":tsproject/sample.lint.ts");
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(2);
  }
}
