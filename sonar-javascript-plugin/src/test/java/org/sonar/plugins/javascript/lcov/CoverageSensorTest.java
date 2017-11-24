/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.plugins.javascript.lcov;

import com.google.common.base.Charsets;
import com.google.common.collect.ImmutableSet;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.Settings;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.utils.log.LogTester;
import org.sonar.plugins.javascript.JavaScriptPlugin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY;

public class CoverageSensorTest {

  private static final String UT_LCOV = "reports/report_ut.lcov";
  private static final String IT_LCOV = "reports/report_it.lcov";
  private SensorContextTester context;
  private Settings settings;
  private Map<InputFile, Set<Integer>> linesOfCode;

  private LCOVCoverageSensor coverageSensor = new LCOVCoverageSensor();
  private UTCoverageSensor utCoverageSensor = new UTCoverageSensor();
  private ITCoverageSensor itCoverageSensor = new ITCoverageSensor();
  private OverallCoverageSensor overallCoverageSensor = new OverallCoverageSensor();
  private File moduleBaseDir = new File("src/test/resources/coverage/");

  private static final boolean RUN_WITH_SQ_6_2 = true;
  private static final boolean RUN_WITH_SQ_6_1 = false;

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @Before
  public void init() throws FileNotFoundException {
    settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, UT_LCOV);
    settings.setProperty(JavaScriptPlugin.LCOV_IT_REPORT_PATH, IT_LCOV);
    context = SensorContextTester.create(moduleBaseDir);
    context.setSettings(settings);

    InputFile inputFile1 = inputFile("file1.js", Type.MAIN);
    InputFile inputFile2 = inputFile("file2.js", Type.MAIN);
    inputFile("tests/file1.js", Type.TEST);

    linesOfCode = new HashMap<>();
    linesOfCode.put(inputFile1, ImmutableSet.of(1, 2, 3, 4));
    linesOfCode.put(inputFile2, ImmutableSet.of(1, 2, 3));
  }

  private InputFile inputFile(String relativePath, Type type) throws FileNotFoundException {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(moduleBaseDir.toPath())
      .setLanguage("js")
      .setType(type)
      .build();

    inputFile.setMetadata(new FileMetadata().readMetadata(new FileInputStream(inputFile.file()), Charsets.UTF_8, inputFile.absolutePath()));
    context.fileSystem().add(inputFile);

    return inputFile;
  }

  @Test
  public void report_not_found() throws Exception {
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "/fake/path/lcov_report.dat");

    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);

    // expected logged text: "No coverage information will be saved because all LCOV files cannot be found."
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
  }

  @Test
  public void test_ut_coverage() {
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);
    Integer[] file1Expected = {2, 2, 1, null};
    Integer[] file2Expected = {5, 5, null, null};

    for (int line = 1; line <= 4; line++) {
      assertThat(context.lineHits("moduleKey:file1.js", line)).isEqualTo(file1Expected[line - 1]);
      assertThat(context.lineHits("moduleKey:file2.js", line)).isEqualTo(file2Expected[line - 1]);
      assertThat(context.lineHits("moduleKey:file3.js", line)).isNull();
      assertThat(context.lineHits("moduleKey:tests/file1.js", line)).isNull();
    }

    assertThat(context.conditions("moduleKey:file1.js", 1)).isNull();
    assertThat(context.conditions("moduleKey:file1.js", 2)).isEqualTo(4);
    assertThat(context.coveredConditions("moduleKey:file1.js", 2)).isEqualTo(2);
  }

  @Test
  public void test_it_coverage() {
    itCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);

    Integer[] file1Expected = {1, 1, 0, null};
    Integer[] file2Expected = {0, 0, 0, null};

    for (int line = 1; line <= 4; line++) {
      assertThat(context.lineHits("moduleKey:file1.js", line)).isEqualTo(file1Expected[line - 1]);
      assertThat(context.lineHits("moduleKey:file2.js", line)).isEqualTo(file2Expected[line - 1]);
    }

    assertThat(context.conditions("moduleKey:file1.js", 1)).isNull();
    assertThat(context.conditions("moduleKey:file1.js", 2)).isEqualTo(4);
    assertThat(context.coveredConditions("moduleKey:file1.js", 2)).isEqualTo(1);
  }

  @Test
  public void test_overall_coverage() {
    overallCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);

    Integer[] file1Expected = {3, 3, 1, null};
    Integer[] file2Expected = {5, 5, null, null};

    for (int line = 1; line <= 4; line++) {
      assertThat(context.lineHits("moduleKey:file1.js", line)).isEqualTo(file1Expected[line - 1]);
      assertThat(context.lineHits("moduleKey:file2.js", line)).isEqualTo(file2Expected[line - 1]);
      assertThat(context.lineHits("moduleKey:file3.js", line)).isNull();
      assertThat(context.lineHits("moduleKey:tests/file1.js", line)).isNull();
    }

    assertThat(context.conditions("moduleKey:file1.js", 1)).isNull();
    assertThat(context.conditions("moduleKey:file1.js", 2)).isEqualTo(4);
    assertThat(context.coveredConditions("moduleKey:file1.js", 2)).isEqualTo(3);
  }

  @Test
  public void should_ignore_and_log_warning_for_invalid_line() {
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "reports/wrong_line_report.lcov");
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);

    assertThat(context.lineHits("moduleKey:file1.js", 0)).isNull();
    assertThat(context.lineHits("moduleKey:file1.js", 2)).isEqualTo(1);

    assertThat(context.conditions("moduleKey:file1.js", 102)).isNull();
    assertThat(context.conditions("moduleKey:file1.js", 2)).isEqualTo(3);
    assertThat(context.coveredConditions("moduleKey:file1.js", 2)).isEqualTo(1);

    assertThat(logTester.logs()).contains("Problem during processing LCOV report: can't save DA data for line 3 of coverage report file (java.lang.IllegalArgumentException: Line with number 0 doesn't belong to file file1.js).");
    assertThat(logTester.logs()).contains("Problem during processing LCOV report: can't save BRDA data for line 8 of coverage report file (java.lang.IllegalArgumentException: Line with number 102 doesn't belong to file file1.js).");
  }

  @Test
  public void test_unresolved_path() {
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "reports/report_with_unresolved_path.lcov");
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);

    // expected logged text: "Could not resolve 1 file paths in [...], first unresolved path: unresolved/file1.js"
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isEqualTo(0);
  }

  @Test
  public void test_no_report_path_no_force_zero() {
    context.setSettings(new MapSettings());
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();

    context.setSettings(new MapSettings().setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, UT_LCOV));
    itCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isEqualTo(2);
    overallCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isEqualTo(4);
  }

  @Test
  public void test_force_zero_coverage_no_report() {
    Settings newSettings = new MapSettings().setProperty(FORCE_ZERO_COVERAGE_KEY, "true");
    context.setSettings(newSettings);
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isEqualTo(0);
  }

  @Test
  public void test_force_zero_coverage_no_lines_of_code() throws Exception {
    Settings newSettings = new MapSettings().setProperty(FORCE_ZERO_COVERAGE_KEY, "true");
    context.setSettings(newSettings);
    utCoverageSensor.execute(context, new HashMap<>(), RUN_WITH_SQ_6_1);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
  }

  // SONARJS-801
  @Test
  public void not_save_zero_coverage_sq_62() throws Exception {
    // even with this property is true, when SQ>6.1 we should not save zero coverage (this will be done on platform side)
    Settings newSettings = new MapSettings().setProperty(FORCE_ZERO_COVERAGE_KEY, "true");
    context.setSettings(newSettings);

    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_2);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();

    newSettings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, UT_LCOV);
    context.setSettings(newSettings);

    itCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_2);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
  }

  @Test
  public void save_coverage_sq_62() throws Exception {
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_2);
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isEqualTo(2);
  }

  @Test
  public void test_report_paths_parsing() throws Exception {
    assertThat(parsePaths("")).isEmpty();
    assertThat(parsePaths(" a , ")).containsOnly("a");
    assertThat(parsePaths("a , b, d,e")).containsOnly("a", "b", "d", "e");
    assertThat(parsePaths("a/b/c.bar, d/e.foo")).containsOnly("a/b/c.bar", "d/e.foo");
  }

  @Test
  public void should_log_warning_when_wrong_data() throws Exception {
    settings.setProperty(JavaScriptPlugin.LCOV_UT_REPORT_PATH, "reports/wrong_data_report.lcov");
    utCoverageSensor.execute(context, linesOfCode, RUN_WITH_SQ_6_1);

    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
    assertThat(context.lineHits("moduleKey:file1.js", 2)).isEqualTo(1);

    assertThat(context.conditions("moduleKey:file1.js", 2)).isEqualTo(2);
    assertThat(context.coveredConditions("moduleKey:file1.js", 2)).isEqualTo(2);

    assertThat(logTester.logs()).contains("Problem during processing LCOV report: can't save DA data for line 3 of coverage report file (java.lang.NumberFormatException: For input string: \"1.\").");
    assertThat(logTester.logs()).contains("Problem during processing LCOV report: can't save DA data for line 4 of coverage report file (java.lang.StringIndexOutOfBoundsException: String index out of range: -1).");
    assertThat(logTester.logs()).contains("Problem during processing LCOV report: can't save BRDA data for line 6 of coverage report file (java.lang.ArrayIndexOutOfBoundsException: 3).");
  }

  private List<String> parsePaths(String input) {
    settings = new MapSettings().setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, input);
    context.setSettings(settings);
    return coverageSensor.parseReportsProperty(context);
  }
}
