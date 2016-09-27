/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.junit.ClassRule;
import org.junit.runner.RunWith;
import org.junit.runners.Suite;

@RunWith(Suite.class)
@Suite.SuiteClasses({
  BigProjectTest.class,
  CoverageTest.class,
  CustomRulesTests.class,
  MetricsTest.class,
  MinifiedFilesTest.class,
  SonarLintTest.class,
  DefaultProfileTest.class
})
public final class Tests {

  private static final String CUSTOM_RULES_ARTIFACT_ID = "javascript-custom-rules-plugin";

  public static final String PROJECT_KEY = "project";

  public static final FileLocation JAVASCRIPT_PLUGIN_LOCATION = FileLocation.byWildcardMavenFilename(
    new File("../../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar");

  @ClassRule
  public static final Orchestrator ORCHESTRATOR = Orchestrator.builderEnv()
    .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
    .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-profile.xml"))
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../plugins/" + CUSTOM_RULES_ARTIFACT_ID + "/target"), CUSTOM_RULES_ARTIFACT_ID + "-*.jar"))
    .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
    .build();

  private Tests() {
  }

  public static SonarScanner createScanner() {
    SonarScanner scanner = SonarScanner.create();
    scanner.setProperty("sonar.exclusions", "**/ecmascript6/**, **/file-for-rules/**, **/frameworks/**");
    scanner.setSourceEncoding("UTF-8");

    return scanner;
  }

  public static void setEmptyProfile(String projectKey, String projectName) {
    ORCHESTRATOR.getServer().provisionProject(projectKey, projectName);
    ORCHESTRATOR.getServer().associateProjectToQualityProfile(projectKey, "js", "empty-profile");
  }

}
