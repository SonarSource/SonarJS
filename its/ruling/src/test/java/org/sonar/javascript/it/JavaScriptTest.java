/*
 * SonarSource :: JavaScript :: ITs :: Ruling
 * Copyright (C) 2012 SonarSource
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.it;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarRunner;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.issue.Issue;
import org.sonar.wsclient.issue.IssueQuery;

import java.util.List;

import static org.fest.assertions.Assertions.assertThat;

public class JavaScriptTest {

  private static final String PLUGIN_KEY = "javascript";
  @ClassRule
  public static Orchestrator orchestrator = Orchestrator.builderEnv()
    .addPlugin(PLUGIN_KEY)
    .setMainPluginKey(PLUGIN_KEY)
    .addPlugin(MavenLocation.create("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", "0.5-SNAPSHOT"))
    .restoreProfileAtStartup(FileLocation.of("src/test/profile.xml"))
    .build();

  @Test
  public void test() throws Exception {
    SonarRunner build = SonarRunner.create(orchestrator.getFileLocationOfShared("src").getFile())
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1")
      .setLanguage("js")
      .setSourceDirs("./")
      .setSourceEncoding("utf-8")
      .setProfile("rules")
      .setProperty("dump.old", FileLocation.of("src/test/expected").getFile().getAbsolutePath())
      .setProperty("dump.new", FileLocation.of("target/actual").getFile().getAbsolutePath())
      .setProperty("sonar.cpd.skip", "true")
      .setProperty("sonar.analysis.mode", "preview")
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx1024m");
    orchestrator.executeBuild(build);

    assertThatNoDifferences();
  }

  private void assertThatNoDifferences() {
    List<Issue> issues = orchestrator.getServer().wsClient().issueClient().find(IssueQuery.create().componentRoots("project").severities("BLOCKER", "INFO")).list();
    assertThat(issues.size()).as("differences").isEqualTo(0);
  }

}
