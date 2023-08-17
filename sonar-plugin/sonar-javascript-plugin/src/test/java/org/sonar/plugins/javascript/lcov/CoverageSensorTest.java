/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import static org.assertj.core.api.Assertions.assertThat;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.event.Level;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.DefaultSensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.JavaScriptPlugin;

class CoverageSensorTest {

  private static final String REPORT1 = "reports/report_1.lcov";
  private static final String REPORT2 = "reports/report_2.lcov";
  private static final String TWO_REPORTS = REPORT1 + ", " + REPORT2;

  private SensorContextTester context;
  private MapSettings settings;

  @TempDir
  Path tempDir;

  private CoverageSensor coverageSensor = new CoverageSensor();
  private File moduleBaseDir = new File("src/test/resources/coverage/").getAbsoluteFile();

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @BeforeEach
  public void init() throws FileNotFoundException {
    settings = new MapSettings();

    context = SensorContextTester.create(moduleBaseDir);
    context.setSettings(settings);

    inputFile("file1.js", Type.MAIN);
    inputFile("file2.js", Type.MAIN);
    inputFile("tests/file1.js", Type.TEST);
  }

  private InputFile inputFile(String relativePath, Type type) throws FileNotFoundException {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(moduleBaseDir.toPath())
      .setLanguage("js")
      .setType(type)
      .build();

    inputFile.setMetadata(
      new FileMetadata(s -> {})
        .readMetadata(
          new FileInputStream(inputFile.file()),
          StandardCharsets.UTF_8,
          inputFile.absolutePath()
        )
    );
    context.fileSystem().add(inputFile);

    return inputFile;
  }

  @Test
  void report_not_found() throws Exception {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "/fake/path/lcov_report.dat");

    coverageSensor.execute(context);

    // expected logged text: "No coverage information will be saved because all LCOV files cannot be found."
    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
  }

  @Test
  void test_coverage() {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, TWO_REPORTS);
    coverageSensor.execute(context);
    assertTwoReportsCoverageDataPresent();
  }

  @Test
  void test_alias() {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS, TWO_REPORTS);
    coverageSensor.execute(context);
    assertTwoReportsCoverageDataPresent();
  }

  @Test
  void test_merging() {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, REPORT1);
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS, REPORT2);
    coverageSensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.INFO))
      .contains(
        String.format(
          "Merging coverage reports from %s and %s.",
          JavaScriptPlugin.LCOV_REPORT_PATHS,
          JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS
        )
      );
    assertTwoReportsCoverageDataPresent();
  }

  @Test
  void test_used_property_log() {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, TWO_REPORTS);
    coverageSensor.execute(context);
    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains(String.format("Property %s is used.", JavaScriptPlugin.LCOV_REPORT_PATHS));
  }

  private void assertTwoReportsCoverageDataPresent() {
    Integer[] file1Expected = { 3, 3, 1, null };
    Integer[] file2Expected = { 5, 5, null, null };

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
  void should_ignore_and_log_warning_for_invalid_line() {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "reports/wrong_line_report.lcov");
    coverageSensor.execute(context);

    assertThat(context.lineHits("moduleKey:file1.js", 0)).isNull();
    assertThat(context.lineHits("moduleKey:file1.js", 2)).isEqualTo(1);

    assertThat(context.conditions("moduleKey:file1.js", 102)).isNull();
    assertThat(context.conditions("moduleKey:file1.js", 2)).isEqualTo(3);
    assertThat(context.coveredConditions("moduleKey:file1.js", 2)).isEqualTo(1);

    assertThat(logTester.logs())
      .contains(
        "Problem during processing LCOV report: can't save DA data for line 3 of coverage report file (java.lang.IllegalArgumentException: Line with number 0 doesn't belong to file file1.js)."
      );
    assertThat(logTester.logs())
      .contains(
        "Problem during processing LCOV report: can't save BRDA data for line 8 of coverage report file (java.lang.IllegalArgumentException: Line with number 102 doesn't belong to file file1.js)."
      );
  }

  @Test
  void test_unresolved_path() {
    logTester.setLevel(Level.INFO);
    settings.setProperty(
      JavaScriptPlugin.LCOV_REPORT_PATHS,
      "reports/report_with_unresolved_path.lcov"
    );
    coverageSensor.execute(context);
    String fileName =
      File.separator + "reports" + File.separator + "report_with_unresolved_path.lcov";
    assertThat(logTester.logs(Level.WARN))
      .contains(
        "Could not resolve 2 file paths in [" + moduleBaseDir.getAbsolutePath() + fileName + "]"
      )
      .contains(
        "First unresolved path: unresolved/file1.js (Run in DEBUG mode to get full list of unresolved paths)"
      );
  }

  @Test
  void test_unresolved_path_with_debug_log() {
    logTester.setLevel(Level.DEBUG);
    settings.setProperty(
      JavaScriptPlugin.LCOV_REPORT_PATHS,
      "reports/report_with_unresolved_path.lcov"
    );
    coverageSensor.execute(context);
    String fileName =
      File.separator + "reports" + File.separator + "report_with_unresolved_path.lcov";
    assertThat(logTester.logs(Level.WARN))
      .contains(
        "Could not resolve 2 file paths in [" + moduleBaseDir.getAbsolutePath() + fileName + "]"
      );
    assertThat(logTester.logs(Level.DEBUG))
      .contains("Unresolved paths:\n" + "unresolved/file1.js\n" + "unresolved/file2.js");
  }

  @Test
  void should_log_warning_when_wrong_data() throws Exception {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "reports/wrong_data_report.lcov");
    coverageSensor.execute(context);

    assertThat(context.lineHits("moduleKey:file1.js", 1)).isNull();
    assertThat(context.lineHits("moduleKey:file1.js", 2)).isEqualTo(1);

    assertThat(context.conditions("moduleKey:file1.js", 2)).isEqualTo(2);
    assertThat(context.coveredConditions("moduleKey:file1.js", 2)).isEqualTo(2);

    assertThat(logTester.logs(LoggerLevel.DEBUG))
      .contains(
        "Problem during processing LCOV report: can't save DA data for line 3 of coverage report file (java.lang.NumberFormatException: For input string: \"1.\")."
      );
    String stringIndexOutOfBoundLogMessage = logTester.logs(LoggerLevel.DEBUG).get(3);
    assertThat(stringIndexOutOfBoundLogMessage)
      .startsWith(
        "Problem during processing LCOV report: can't save DA data for line 4 of coverage report file (java.lang.StringIndexOutOfBoundsException:"
      );
    assertThat(logTester.logs(LoggerLevel.DEBUG).get(logTester.logs(LoggerLevel.DEBUG).size() - 1))
      .startsWith(
        "Problem during processing LCOV report: can't save BRDA data for line 6 of coverage report file (java.lang.ArrayIndexOutOfBoundsException: "
      );
    assertThat(logTester.logs(LoggerLevel.WARN))
      .contains(
        "Found 3 inconsistencies in coverage report. Re-run analyse in debug mode to see details."
      );
  }

  @Test
  void should_contain_sensor_descriptor() {
    DefaultSensorDescriptor descriptor = new DefaultSensorDescriptor();

    coverageSensor.describe(descriptor);
    assertThat(descriptor.name()).isEqualTo("JavaScript/TypeScript Coverage");
    assertThat(descriptor.languages()).contains("js", "ts");
    assertThat(descriptor.type()).isEqualTo(Type.MAIN);
    assertThat(
      descriptor
        .configurationPredicate()
        .test(new MapSettings().setProperty("sonar.javascript.lcov.reportPaths", "foo").asConfig())
    )
      .isTrue();
    assertThat(
      descriptor
        .configurationPredicate()
        .test(new MapSettings().setProperty("sonar.typescript.lcov.reportPaths", "bar").asConfig())
    )
      .isTrue();
    assertThat(descriptor.configurationPredicate().test(new MapSettings().asConfig())).isFalse();
  }

  @Test
  void should_resolve_relative_path_and_outside_base_dir() throws Exception {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "../report_relative_path.lcov");
    inputFile("deep/nested/dir/js/file1.js", Type.MAIN);
    inputFile("deep/nested/dir/js/file2.js", Type.MAIN);
    coverageSensor.execute(context);

    String file1Key = "moduleKey:deep/nested/dir/js/file1.js";
    assertThat(context.lineHits(file1Key, 0)).isNull();
    assertThat(context.lineHits(file1Key, 1)).isEqualTo(2);
    assertThat(context.lineHits(file1Key, 2)).isEqualTo(2);

    assertThat(context.conditions(file1Key, 102)).isNull();
    assertThat(context.conditions(file1Key, 2)).isEqualTo(4);
    assertThat(context.coveredConditions(file1Key, 2)).isEqualTo(2);

    String file2Key = "moduleKey:deep/nested/dir/js/file2.js";
    assertThat(context.lineHits(file2Key, 0)).isNull();
    assertThat(context.lineHits(file2Key, 1)).isEqualTo(5);
    assertThat(context.lineHits(file2Key, 2)).isEqualTo(5);
  }

  @Test
  void should_resolve_absolute_path() throws Exception {
    Path lcovFile = tempDir.resolve("lcovfile");
    String absolutePathFile1 = new File("src/test/resources/coverage/file1.js").getAbsolutePath();
    String absolutePathFile2 = new File("src/test/resources/coverage/file2.js").getAbsolutePath();

    Files.write(
      lcovFile,
      (
        "SF:" +
        absolutePathFile1 +
        "\n" +
        "DA:1,2\n" +
        "DA:2,2\n" +
        "DA:3,1\n" +
        "FN:2,(anonymous_1)\n" +
        "FNDA:2,(anonymous_1)\n" +
        "BRDA:2,1,0,2\n" +
        "BRDA:2,1,1,1\n" +
        "BRDA:2,2,0,0\n" +
        "BRDA:2,2,1,-\n" +
        "end_of_record\n" +
        "SF:" +
        absolutePathFile2 +
        "\n" +
        "DA:1,5\n" +
        "DA:2,5\n" +
        "end_of_record\n"
      ).getBytes(StandardCharsets.UTF_8)
    );
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, lcovFile.toAbsolutePath().toString());
    inputFile("file1.js", Type.MAIN);
    inputFile("file2.js", Type.MAIN);
    coverageSensor.execute(context);

    String file1Key = "moduleKey:file1.js";
    assertThat(context.lineHits(file1Key, 0)).isNull();
    assertThat(context.lineHits(file1Key, 1)).isEqualTo(2);
    assertThat(context.lineHits(file1Key, 2)).isEqualTo(2);

    assertThat(context.conditions(file1Key, 102)).isNull();
    assertThat(context.conditions(file1Key, 2)).isEqualTo(4);
    assertThat(context.coveredConditions(file1Key, 2)).isEqualTo(2);

    String file2Key = "moduleKey:file2.js";
    assertThat(context.lineHits(file2Key, 0)).isNull();
    assertThat(context.lineHits(file2Key, 1)).isEqualTo(5);
    assertThat(context.lineHits(file2Key, 2)).isEqualTo(5);
  }

  @Test
  void should_resolve_wildcard_report_paths() throws Exception {
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, "**/wildcard/**/*.lcov");
    inputFile("file1.js", Type.MAIN);
    inputFile("file2.js", Type.MAIN); // not referenced in any '**/wildcard/**/*.lcov' files
    inputFile("tests/file1.js", Type.MAIN);
    coverageSensor.execute(context);

    String file1Key = "moduleKey:file1.js";
    assertThat(context.lineHits(file1Key, 2)).isEqualTo(1);

    String file2Key = "moduleKey:file2.js";
    assertThat(context.lineHits(file2Key, 2)).isNull();

    String nestedFileKey = "moduleKey:tests/file1.js";
    assertThat(context.lineHits(nestedFileKey, 2)).isEqualTo(1);
  }

  @Test
  void should_import_coverage_for_ts() throws Exception {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", "src/file1.ts")
      .setModuleBaseDir(moduleBaseDir.toPath())
      .setLanguage("ts")
      .setContents(
        "function foo(x: any) {\n" + "  if (x && !x)\n" + "    console.log(\"file1\");\n" + "}\n"
      )
      .build();
    context.fileSystem().add(inputFile);

    Path lcov = tempDir.resolve("file.lcov");
    Files.write(
      lcov,
      (
        "SF:src/file1.ts\n" +
        "DA:1,2\n" +
        "DA:2,2\n" +
        "DA:3,1\n" +
        "FN:2,(anonymous_1)\n" +
        "FNDA:2,(anonymous_1)\n" +
        "BRDA:2,1,0,2\n" +
        "BRDA:2,1,1,1\n" +
        "BRDA:2,2,0,0\n" +
        "BRDA:2,2,1,-\n" +
        "end_of_record\n" +
        "SF:src/file2.ts\n" +
        "DA:1,5\n" +
        "DA:2,5\n" +
        "end_of_record\n"
      ).getBytes(StandardCharsets.UTF_8)
    );
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, lcov.toAbsolutePath().toString());
    coverageSensor.execute(context);
    assertThat(context.lineHits(inputFile.key(), 1)).isEqualTo(2);
    assertThat(context.lineHits(inputFile.key(), 2)).isEqualTo(2);
    assertThat(context.lineHits(inputFile.key(), 3)).isEqualTo(1);
    assertThat(context.lineHits(inputFile.key(), 0)).isNull();
  }
}
