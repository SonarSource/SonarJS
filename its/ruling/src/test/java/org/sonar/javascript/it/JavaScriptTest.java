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
package org.sonar.javascript.it;

import com.google.common.io.Files;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarRunner;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.nio.charset.StandardCharsets;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Test;

import static junit.framework.TestCase.assertTrue;
import static org.fest.assertions.Assertions.assertThat;

public class JavaScriptTest {

  @ClassRule
  public static Orchestrator orchestrator = Orchestrator.builderEnv()
    .addPlugin(FileLocation.byWildcardMavenFilename(
      new File("../../sonar-javascript-plugin/target"), "sonar-javascript-plugin-*.jar"))
    .setOrchestratorProperty("litsVersion", "0.5")
    .addPlugin("lits")
    .build();

  @Before
  public void setUp() throws Exception {
    ProfileGenerator.generateProfile(orchestrator);
  }

  @Test
  public void test() throws Exception {
    assertTrue(
      "SonarQube 5.1 is the minimum version to generate the issues report, change your orchestrator.properties",
      orchestrator.getConfiguration().getSonarVersion().isGreaterThanOrEquals("5.1"));
    File litsDifferencesFile = FileLocation.of("target/differences").getFile();
    orchestrator.getServer().provisionProject("project", "project");
    orchestrator.getServer().associateProjectToQualityProfile("project", "js", "rules");
    SonarRunner build = SonarRunner.create(FileLocation.of("../sources/src").getFile())
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1")
      .setLanguage("js")
      .setSourceDirs("./")
      .setSourceEncoding("utf-8")
      .setProperty("sonar.analysis.mode", "preview")
      .setProperty("sonar.issuesReport.html.enable", "true")
      .setProperty("dump.old", FileLocation.of("src/test/expected").getFile().getAbsolutePath())
      .setProperty("dump.new", FileLocation.of("target/actual").getFile().getAbsolutePath())
      .setProperty("lits.differences", litsDifferencesFile.getAbsolutePath())
      .setProperty("sonar.cpd.skip", "true")
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx1024m");
    orchestrator.executeBuild(build);

    assertThat(Files.toString(litsDifferencesFile, StandardCharsets.UTF_8)).isEmpty();
  }

}
