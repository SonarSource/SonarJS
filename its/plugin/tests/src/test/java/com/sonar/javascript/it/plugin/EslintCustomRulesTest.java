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
import com.sonar.orchestrator.build.BuildResult;
import java.io.File;
import java.io.File;
import java.util.List;
import org.assertj.core.groups.Tuple;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.Issues.Issue;

import static com.sonar.javascript.it.plugin.CustomRulesTest.initOrchestrator;
import static com.sonar.javascript.it.plugin.CustomRulesTest.runBuild;
import static org.assertj.core.api.Assertions.assertThat;

public class EslintCustomRulesTest {
  private static final String PLUGIN_ARTIFACT_ID = "eslint-custom-rules-plugin";

  private static Orchestrator orchestrator;

  @BeforeClass
  public static void before() {
    orchestrator = initOrchestrator(PLUGIN_ARTIFACT_ID);
  }


  @AfterClass
  public static void after() {
    orchestrator.stop();
  }

  @Test
  public void test() {
    BuildResult buildResult = runBuild(orchestrator);
    assertThat(buildResult.getLogsLines(l -> l.matches(".*INFO: Deploying custom rules bundle jar:file:.*/custom-eslint-based-rules-1\\.0\\.0\\.tgz to .*"))).hasSize(1);
    List<Issue> issues = CustomRulesTest.findIssues("eslint-custom-rules:sqKey", orchestrator);
    assertThat(issues).hasSize(2);
    assertThat(issues).extracting(Issue::getRule, Issue::getComponent, Issue::getLine, Issue::getMessage)
      .containsExactlyInAnyOrder(
        new Tuple("eslint-custom-rules:sqKey", "custom-rules:src/dir/Person.js", 21, "call"),
        new Tuple("eslint-custom-rules:sqKey", "custom-rules:src/dir/file.ts", 4, "call")
      );
    Issues.Location secondaryLocation = issue.getFlows(0).getLocations(0);
    assertThat(secondaryLocation.getMsg()).isEqualTo(new File(TestUtils.projectDir("custom_rules"), ".scannerwork").getAbsolutePath());

    issues = CustomRulesTest.findIssues("ts-custom-rules:tsRuleKey", orchestrator);
    assertThat(issues).extracting(Issue::getRule, Issue::getComponent, Issue::getLine, Issue::getMessage)
      .containsExactlyInAnyOrder(
        new Tuple("ts-custom-rules:tsRuleKey", "custom-rules:src/dir/file.ts", 4, "tsrule call")
      );

  }

}
