/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2017 SonarSource SA
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
import org.sonarqube.ws.WsMeasures;

import static com.sonar.javascript.it.plugin.Tests.getMeasure;
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
    assertThat(getProjectMeasureAsDouble("lines")).isEqualTo(1029040d);
    assertThat(getProjectMeasureAsDouble("files")).isEqualTo(4523d);
    assertThat(getProjectMeasureAsDouble("directories")).isEqualTo(972d);
    assertThat(getProjectMeasureAsDouble("functions")).isEqualTo(46609d);
    assertThat(getProjectMeasureAsDouble("statements")).isEqualTo(285817d);

    // Documentation
    assertThat(getProjectMeasureAsDouble("comment_lines")).isEqualTo(262126d);
    assertThat(getProjectMeasureAsDouble("commented_out_code_lines")).isNull();
    assertThat(getProjectMeasureAsDouble("comment_lines_density")).isEqualTo(31.2);

    // Complexity
    // Since ES6 support
    assertThat(getProjectMeasureAsDouble("complexity")).isEqualTo(140046.0d);
    assertThat(getProjectMeasure("function_complexity_distribution").getValue())
      .isEqualTo("1=22819;2=13140;4=5014;6=2233;8=1188;10=701;12=1045;20=318;30=151");

    // SONARJS-299
    assertThat(getProjectMeasureAsDouble("function_complexity")).isEqualTo(2.9);
    assertThat(getProjectMeasureAsDouble("file_complexity")).isEqualTo(31.9);
    assertThat(getProjectMeasure("file_complexity_distribution").getValue())
      .isEqualTo("0=2101;5=321;10=500;20=364;30=486;60=271;90=344");

    // Duplication
    // SONAR-7026
    assertThat(getProjectMeasureAsDouble("duplicated_lines")).isEqualTo(107825.0);
    assertThat(getProjectMeasureAsDouble("duplicated_blocks")).isEqualTo(13873.0);
    assertThat(getProjectMeasureAsDouble("duplicated_lines_density")).isEqualTo(10.5);
    assertThat(getProjectMeasureAsDouble("duplicated_files")).isEqualTo(561.0);
  }

  private WsMeasures.Measure getProjectMeasure(String metricKey) {
    return getMeasure("project", metricKey);
  }

  private Double getProjectMeasureAsDouble(String metricKey) {
    return getMeasureAsDouble("project", metricKey);
  }

}
