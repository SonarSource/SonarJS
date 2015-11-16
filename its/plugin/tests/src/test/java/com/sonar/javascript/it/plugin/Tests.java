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
import com.sonar.orchestrator.locator.FileLocation;
import org.junit.ClassRule;
import org.junit.runner.RunWith;
import org.junit.runners.Suite;

import java.io.File;

@RunWith(Suite.class)
@Suite.SuiteClasses({
  BigProjectTest.class,
  MetricsTest.class,
  UnitTestTest.class,
  CustomRulesTests.class,
  CoverageTest.class
})
public final class Tests {

  private static final String PLUGIN_KEY = "javascript";
  private static final String CUSTOM_RULES_ARTIFACT_ID = "javascript-custom-rules-plugin";
  public static final String PROJECT_KEY = "project";

  @ClassRule
  public static final Orchestrator ORCHESTRATOR = Orchestrator.builderEnv()
    .addPlugin(FileLocation.of(new File(TestUtils.homeDir(), "../../sonar-javascript-plugin/target/sonar-javascript-plugin.jar")))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-profile.xml"))
    .addPlugin(FileLocation.of(TestUtils.pluginJar(CUSTOM_RULES_ARTIFACT_ID)))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
    .build();

  private Tests() {
  }

  public static boolean is_after_sonar_5_1() {
    return ORCHESTRATOR.getConfiguration().getSonarVersion().isGreaterThanOrEquals("5.1");
  }

  public static boolean is_after_sonar_5_3() {
    return ORCHESTRATOR.getConfiguration().getSonarVersion().isGreaterThanOrEquals("5.3");
  }

  public static boolean is_strictly_after_plugin(String version) {
    return ORCHESTRATOR.getConfiguration().getPluginVersion(PLUGIN_KEY).isGreaterThan(version);
  }

  public static SonarRunner createSonarRunnerBuild() {
    SonarRunner build = SonarRunner.create();
    build.setProperty("sonar.exclusions", "**/ecmascript6/**, **/file-for-rules/**, **/frameworks/**");
    build.setSourceEncoding("UTF-8");

    return build;
  }


  public static void setEmptyProfile(String projectKey, String projectName) {
    ORCHESTRATOR.getServer().provisionProject(projectKey, projectName);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, "js", "empty-profile");
  }
}
