/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2018 SonarSource SA
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
import com.sonar.orchestrator.locator.FileLocation;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;

import static com.sonar.javascript.it.plugin.Tests.getMeasureAsDouble;
import static org.assertj.core.api.Assertions.assertThat;

public class BigProjectTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @BeforeClass
  public static void prepare() {
    orchestrator.resetData();

    SonarScanner build = Tests.createScanner()
      .setProjectDir(FileLocation.of("../../sources/src").getFile())
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.file.suffixes", ".js")
      // FIXME after full migration of the grammar: was 424m before migration (and with Java 6)
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx2500m");

    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);
  }

  @Test
  public void project_level() {
    // Size
    assertThat(getProjectMeasureAsDouble("ncloc")).isEqualTo(577829d);
    // SONAR-5077: computation of line is done on SQ side
    assertThat(getProjectMeasureAsDouble("lines")).isEqualTo(1026726d);
    assertThat(getProjectMeasureAsDouble("files")).isEqualTo(4387d);
    assertThat(getProjectMeasureAsDouble("directories")).isEqualTo(966d);
    assertThat(getProjectMeasureAsDouble("functions")).isEqualTo(46609d);
    assertThat(getProjectMeasureAsDouble("statements")).isEqualTo(285817d);

    // Documentation
    assertThat(getProjectMeasureAsDouble("comment_lines")).isEqualTo(262126d);
    assertThat(getProjectMeasureAsDouble("commented_out_code_lines")).isNull();
    assertThat(getProjectMeasureAsDouble("comment_lines_density")).isEqualTo(31.2);

    // Complexity
    // Since ES6 support
    assertThat(getProjectMeasureAsDouble("complexity")).isEqualTo(140046.0d);

    // SONARJS-299
    assertThat(getProjectMeasureAsDouble("function_complexity")).isEqualTo(2.9);
    assertThat(getProjectMeasureAsDouble("file_complexity")).isEqualTo(31.9);

    // Duplication
    // SONAR-7026
    assertThat(getProjectMeasureAsDouble("duplicated_lines")).isEqualTo(107825.0);
    assertThat(getProjectMeasureAsDouble("duplicated_blocks")).isEqualTo(13873.0);
    assertThat(getProjectMeasureAsDouble("duplicated_lines_density")).isEqualTo(10.5);
    assertThat(getProjectMeasureAsDouble("duplicated_files")).isEqualTo(561.0);

    assertThat(getProjectMeasureAsDouble("cognitive_complexity")).isEqualTo(147929.0d);
  }

  private Double getProjectMeasureAsDouble(String metricKey) {
    return getMeasureAsDouble("project", metricKey);
  }

}
