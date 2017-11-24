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
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.utils.log.LogTester;
import org.sonar.plugins.javascript.JavaScriptPlugin;

import static org.assertj.core.api.Assertions.assertThat;

public class CoverageSensorTest {

  private static final String UT_LCOV = "reports/report_ut.lcov";
  private static final String IT_LCOV = "reports/report_it.lcov";
  private SensorContextTester context;
  private MapSettings settings;

  private LCOVCoverageSensor coverageSensor = new LCOVCoverageSensor();
  private File moduleBaseDir = new File("src/test/resources/coverage/").getAbsoluteFile();

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @Before
  public void init() throws FileNotFoundException {
    settings = new MapSettings();
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, UT_LCOV + ", " + IT_LCOV);
    context = SensorContextTester.create(moduleBaseDir);
    context.setSettings(settings);

    InputFile inputFile1 = inputFile("file1.js", Type.MAIN);
    InputFile inputFile2 = inputFile("file2.js", Type.MAIN);
    inputFile("tests/file1.js", Type.TEST);
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
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "/fake/path/lcov_report.dat");

    coverageSensor.execute(context);

    // expected logged text: "No coverage information will be saved because all LCOV files cannot be found."
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
  }

  @Test
  public void test_coverage() {
    coverageSensor.execute(context);

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
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "reports/wrong_line_report.lcov");
    coverageSensor.execute(context);

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
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "reports/report_with_unresolved_path.lcov");
    coverageSensor.execute(context);

    // expected logged text: "Could not resolve 1 file paths in [...], first unresolved path: unresolved/file1.js"
    assertThat(logTester.logs()).contains("Could not resolve 1 file paths in [" + moduleBaseDir.getAbsolutePath() +  "/reports/report_with_unresolved_path.lcov], first unresolved path: unresolved/file1.js");
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
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "reports/wrong_data_report.lcov");
    coverageSensor.execute(context);

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
