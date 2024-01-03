/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasure;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasureAsDouble;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Measures.Measure;

@ExtendWith(OrchestratorStarter.class)
class MetricsTest {

  private static final String PROJECT_KEY = "MetricsTest";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @BeforeAll
  public static void prepare() {
    SonarScanner build = OrchestratorStarter
      .createScanner()
      .setProjectDir(TestUtils.projectDir("metrics"))
      .setProjectKey(PROJECT_KEY)
      .setProjectName(PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs("src");
    OrchestratorStarter.setEmptyProfile(PROJECT_KEY);
    orchestrator.executeBuild(build);
  }

  @Test
  void project_level() {
    // Size
    assertThat(getProjectMeasureAsDouble("ncloc")).isEqualTo(20);
    assertThat(getProjectMeasureAsDouble("classes")).isEqualTo(1);
    assertThat(getProjectMeasureAsDouble("functions")).isEqualTo(5);
    assertThat(getProjectMeasureAsDouble("statements")).isEqualTo(8);

    // Documentation
    assertThat(getProjectMeasureAsDouble("comment_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsDouble("comment_lines_density")).isEqualTo(4.8);

    // Complexity
    assertThat(getProjectMeasureAsDouble("complexity")).isEqualTo(6.0);

    // Duplication
    assertThat(getProjectMeasureAsDouble("duplicated_lines")).isEqualTo(0.0);
    assertThat(getProjectMeasureAsDouble("duplicated_blocks")).isEqualTo(0.0);
    assertThat(getProjectMeasureAsDouble("duplicated_files")).isEqualTo(0.0);
    assertThat(getProjectMeasureAsDouble("duplicated_lines_density")).isEqualTo(0.0);
    // Rules
    assertThat(getProjectMeasureAsDouble("violations")).isEqualTo(0.0);
    // Tests
    assertThat(getProjectMeasureAsDouble("tests")).isNull();

    assertThat(getProjectMeasureAsDouble("coverage")).isEqualTo(0.0);
  }

  @Test
  void directory_level() {
    // Size
    assertThat(getDirectoryMeasureAsDouble("ncloc")).isEqualTo(20);
    assertThat(getDirectoryMeasureAsDouble("classes")).isEqualTo(1);
    assertThat(getDirectoryMeasureAsDouble("functions")).isEqualTo(5);
    assertThat(getDirectoryMeasureAsDouble("statements")).isEqualTo(8);
    // Documentation
    assertThat(getDirectoryMeasureAsDouble("comment_lines")).isEqualTo(1);
    assertThat(getDirectoryMeasureAsDouble("comment_lines_density")).isEqualTo(4.8);
    // Duplication
    assertThat(getDirectoryMeasureAsDouble("duplicated_lines")).isEqualTo(0.0);
    assertThat(getDirectoryMeasureAsDouble("duplicated_blocks")).isEqualTo(0.0);
    assertThat(getDirectoryMeasureAsDouble("duplicated_files")).isEqualTo(0.0);
    assertThat(getDirectoryMeasureAsDouble("duplicated_lines_density")).isEqualTo(0.0);
    // Rules
    assertThat(getDirectoryMeasureAsDouble("violations")).isEqualTo(0.0);
  }

  @Test
  void file_level() {
    // Size
    assertThat(getFileMeasureAsDouble("functions")).isEqualTo(5);
    // Documentation
    assertThat(getFileMeasureAsDouble("comment_lines")).isEqualTo(1);
    assertThat(getFileMeasureAsDouble("comment_lines_density")).isEqualTo(4.8);
    // Duplication
    assertThat(getFileMeasureAsDouble("duplicated_lines")).isZero();
    assertThat(getFileMeasureAsDouble("duplicated_blocks")).isZero();
    assertThat(getFileMeasureAsDouble("duplicated_files")).isZero();
    assertThat(getFileMeasureAsDouble("duplicated_lines_density")).isZero();
    // Rules
    assertThat(getFileMeasureAsDouble("violations")).isZero();
  }

  /**
   * SONARPLUGINS-2183
   */
  @Test
  void should_be_compatible_with_DevCockpit() {
    // 2 header comment line
    // 4 empty line
    // 5 code line
    // 14 comment line
    // 15 empty comment line

    assertThat(getFileMeasure("ncloc_data").getValue())
      .doesNotContain(";2=1;")
      .doesNotContain(";4=1;")
      .contains("5=1;")
      .doesNotContain(";14=1;")
      .doesNotContain(";15=1;");
  }

  /* Helper methods */

  private Double getProjectMeasureAsDouble(String metricKey) {
    return getMeasureAsDouble(PROJECT_KEY, metricKey);
  }

  private Double getDirectoryMeasureAsDouble(String metricKey) {
    return getMeasureAsDouble(keyFor("dir"), metricKey);
  }

  private Measure getFileMeasure(String metricKey) {
    return getMeasure(keyFor("dir/Person.js"), metricKey);
  }

  private Double getFileMeasureAsDouble(String metricKey) {
    return getMeasureAsDouble(keyFor("dir/Person.js"), metricKey);
  }

  private static String keyFor(String s) {
    return PROJECT_KEY + ":src/" + s;
  }
}
