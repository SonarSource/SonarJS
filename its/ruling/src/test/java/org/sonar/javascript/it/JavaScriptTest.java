/*
 * Copyright (C) 2012-2014 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
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
