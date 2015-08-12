/*
 * SonarSource :: JavaScript :: ITs :: Plugin :: Tests
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
