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
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.Sonar;
import org.sonar.wsclient.services.Measure;
import org.sonar.wsclient.services.Resource;
import org.sonar.wsclient.services.ResourceQuery;

import static org.assertj.core.api.Assertions.assertThat;

public class MetricsTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static Sonar wsClient;

  @BeforeClass
  public static void prepare() {
    orchestrator.resetData();

    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("metrics"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs("src");
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    wsClient = orchestrator.getServer().getWsClient();
  }

  @Test
  public void project_level() {
    // Size
    assertThat(getProjectMeasure("ncloc").getIntValue()).isEqualTo(20);
    assertThat(getProjectMeasure("lines").getIntValue()).isEqualTo(34);
    assertThat(getProjectMeasure("classes").getIntValue()).isEqualTo(1);
    assertThat(getProjectMeasure("functions").getIntValue()).isEqualTo(5);
    assertThat(getProjectMeasure("statements").getIntValue()).isEqualTo(8);
    assertThat(getProjectMeasure("files").getIntValue()).isEqualTo(1);
    assertThat(getProjectMeasure("directories").getIntValue()).isEqualTo(1);

    // Documentation
    assertThat(getProjectMeasure("comment_lines").getIntValue()).isEqualTo(1);
    assertThat(getProjectMeasure("commented_out_code_lines")).isNull();
    assertThat(getProjectMeasure("comment_lines_density").getValue()).isEqualTo(4.8);

    // Complexity
    assertThat(getProjectMeasure("complexity").getValue()).isEqualTo(6.0);
    assertThat(getProjectMeasure("function_complexity").getValue()).isEqualTo(1.2);
    assertThat(getProjectMeasure("function_complexity_distribution").getData()).isEqualTo("1=4;2=1;4=0;6=0;8=0;10=0;12=0;20=0;30=0");
    assertThat(getProjectMeasure("file_complexity").getValue()).isEqualTo(6.0);
    assertThat(getProjectMeasure("file_complexity_distribution").getData()).isEqualTo("0=0;5=1;10=0;20=0;30=0;60=0;90=0");

    // Duplication
    assertThat(getProjectMeasure("duplicated_lines").getValue()).isEqualTo(0.0);
    assertThat(getProjectMeasure("duplicated_blocks").getValue()).isEqualTo(0.0);
    assertThat(getProjectMeasure("duplicated_files").getValue()).isEqualTo(0.0);
    assertThat(getProjectMeasure("duplicated_lines_density").getValue()).isEqualTo(0.0);
    // Rules
    assertThat(getProjectMeasure("violations").getValue()).isEqualTo(0.0);
    // Tests
    assertThat(getProjectMeasure("tests")).isNull();
    assertThat(getProjectMeasure("coverage")).isNull();
  }

  @Test
  public void directory_level() {
    // Size
    assertThat(getDirectoryMeasure("ncloc").getIntValue()).isEqualTo(20);
    assertThat(getDirectoryMeasure("lines").getIntValue()).isEqualTo(34);
    assertThat(getDirectoryMeasure("classes").getIntValue()).isEqualTo(1);
    assertThat(getDirectoryMeasure("functions").getIntValue()).isEqualTo(5);
    assertThat(getDirectoryMeasure("statements").getIntValue()).isEqualTo(8);
    assertThat(getDirectoryMeasure("files").getIntValue()).isEqualTo(1);
    // Documentation
    assertThat(getDirectoryMeasure("comment_lines").getIntValue()).isEqualTo(1);
    assertThat(getDirectoryMeasure("commented_out_code_lines")).isNull();
    assertThat(getDirectoryMeasure("comment_lines_density").getValue()).isEqualTo(4.8);
    // Complexity
    assertThat(getDirectoryMeasure("file_complexity_distribution").getData()).isEqualTo("0=0;5=1;10=0;20=0;30=0;60=0;90=0");
    // Duplication
    assertThat(getDirectoryMeasure("duplicated_lines").getValue()).isEqualTo(0.0);
    assertThat(getDirectoryMeasure("duplicated_blocks").getValue()).isEqualTo(0.0);
    assertThat(getDirectoryMeasure("duplicated_files").getValue()).isEqualTo(0.0);
    assertThat(getDirectoryMeasure("duplicated_lines_density").getValue()).isEqualTo(0.0);
    // Rules
    assertThat(getDirectoryMeasure("violations").getValue()).isEqualTo(0.0);
  }

  @Test
  public void file_level() {
    // Size
    assertThat(getFileMeasure("functions").getIntValue()).isEqualTo(5);
    assertThat(getFileMeasure("files").getIntValue()).isEqualTo(1);
    // Documentation
    assertThat(getFileMeasure("comment_lines").getIntValue()).isEqualTo(1);
    assertThat(getFileMeasure("commented_out_code_lines")).isNull();
    assertThat(getFileMeasure("comment_lines_density").getValue()).isEqualTo(4.8);
    // Complexity
    assertThat(getFileMeasure("file_complexity_distribution")).isNull();
    // Duplication
    assertThat(getFileMeasure("duplicated_lines")).isNull();
    assertThat(getFileMeasure("duplicated_blocks")).isNull();
    assertThat(getFileMeasure("duplicated_files")).isNull();
    assertThat(getFileMeasure("duplicated_lines_density")).isNull();
    // Rules
    assertThat(getFileMeasure("violations")).isNull();
  }

  /**
   * SONARPLUGINS-2183
   */
  @Test
  public void should_be_compatible_with_DevCockpit() {
    // 2 header comment line
    // 4 empty line
    // 5 code line
    // 14 comment line
    // 15 empty comment line

    assertThat(getFileMeasure("ncloc_data").getData())
      .doesNotContain(";2=1;")
      .doesNotContain(";4=1;")
      .contains("5=1;")
      .doesNotContain(";14=1;")
      .doesNotContain(";15=1;");

    assertThat(getFileMeasure("comment_lines_data").getData())
      .doesNotContain("2=1")
      .doesNotContain(";4=1")
      .doesNotContain(";5=1")
      .contains("14=1")
      .doesNotContain("15=1");
  }

  /* Helper methods */

  private Measure getProjectMeasure(String metricKey) {
    Resource resource = wsClient.find(ResourceQuery.createForMetrics("project", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private Measure getDirectoryMeasure(String metricKey) {
    Resource resource = wsClient.find(ResourceQuery.createForMetrics(keyFor("dir"), metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private Measure getFileMeasure(String metricKey) {
    Resource resource = wsClient.find(ResourceQuery.createForMetrics(keyFor("dir/Person.js"), metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private static String keyFor(String s) {
    return "project:" + (orchestrator.getConfiguration().getSonarVersion().isGreaterThanOrEquals("4.2") ? "src/" : "") + s;
  }

}
