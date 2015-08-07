/*
 * Copyright (C) 2012-2014 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
 */
package com.sonar.javascript.it.plugin;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarRunner;
import static org.fest.assertions.Assertions.assertThat;
import static org.junit.Assume.assumeTrue;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.issue.Issue;
import org.sonar.wsclient.issue.IssueClient;
import org.sonar.wsclient.issue.IssueQuery;

import java.util.List;

public class CustomRulesTests {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @Test
  public void test() throws InterruptedException {
    assumeTrue(Tests.is_strictly_after_plugin("2.5"));

    orchestrator.resetData();
    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("metrics"))
      .setProjectKey("custom-rules")
      .setProjectName("Custom Rules")
      .setProjectVersion("1.0")
      .setSourceDirs("src")
      .setProfile("javascript-custom-rules-profile");
    orchestrator.executeBuild(build);

    IssueClient issueClient = orchestrator.getServer().wsClient().issueClient();

    List<Issue> issues = issueClient.find(IssueQuery.create().rules("javascript-custom-rules:example")).list();

    // We found issues so the extension rule was properly set.
    assertThat(issues).hasSize(2);
    // technical debt is properly set for the issue so SQALE model definition has been well define
    if (Tests.is_strictly_after_plugin("2.6")) {
      assertThat(issues.get(0).debt()).isEqualTo("5min");
    }
  }
}
