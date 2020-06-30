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
import org.junit.ClassRule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameters;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.Tests.getIssues;
import static org.assertj.core.api.Assertions.assertThat;

@RunWith(Parameterized.class)
public class TypeScriptVersionsTest {

  private String tsVersion;
  private boolean doesWork;

  @ClassRule
  public static final Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("tsproject-no-typescript");

  public TypeScriptVersionsTest(String tsVersion, boolean doesWork) {
    this.tsVersion = tsVersion;
    this.doesWork = doesWork;
  }

  @Parameters(name = "{0}")
  public static Object[][] versions() {
    return new Object[][]{
      // some NOT supported version
      {"2.9.2", false},
      // maximum NOT supported version
      {"3.1.6", false},
      // minimal supported version
      {"3.2.1", true},
;      // some supported version
      {"3.6.3", true},
    };
  }

  @Test
  public void test() throws Exception {
    TestUtils.npmInstall(PROJECT_DIR, "typescript@" + tsVersion, "--no-save");

    String projectKey = "tsproject-test-ts-version-" + tsVersion;
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    Tests.setProfile(projectKey, "eslint-based-rules-profile", "ts");

    orchestrator.executeBuild(build);

    String sampleFileKey = projectKey + ":file.ts";
    List<Issues.Issue> issuesList = getIssues(sampleFileKey);

    if (doesWork) {
      assertThat(issuesList).hasSize(1);
      assertThat(issuesList.get(0).getLine()).isEqualTo(2);
    } else {
      assertThat(issuesList).isEmpty();
    }
  }
}
