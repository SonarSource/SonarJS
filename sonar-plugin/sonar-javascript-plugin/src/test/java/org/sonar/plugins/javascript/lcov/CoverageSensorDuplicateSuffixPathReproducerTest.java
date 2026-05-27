/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.lcov;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.event.Level;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.JavaScriptPlugin;

class CoverageSensorDuplicateSuffixPathReproducerTest {

  @TempDir
  Path tempDir;

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  private final CoverageSensor coverageSensor = new CoverageSensor();
  private SensorContextTester context;
  private MapSettings settings;

  @BeforeEach
  void init() {
    settings = new MapSettings();
    context = SensorContextTester.create(tempDir.toFile());
    context.setSettings(settings);
  }

  @Test
  void should_resolve_package_relative_lcov_paths_against_each_report_directory() throws Exception {
    DefaultInputFile packageA = tsInputFile(
      "packages/a/src/index.ts",
      String.join(
          "\n",
          "export const fromA = 1;",
          "export function fromPackageA() {",
          "  return fromA;",
          "}"
        ) +
        "\n"
    );
    DefaultInputFile packageB = tsInputFile(
      "packages/b/src/index.ts",
      String.join(
          "\n",
          "export const fromB = 1;",
          "export function fromPackageB() {",
          "  return fromB + 1;",
          "}",
          "export const uncoveredButCounted = fromB + 2;"
        ) +
        "\n"
    );

    Path packageADir = Files.createDirectories(tempDir.resolve("packages/a"));
    Path packageBDir = Files.createDirectories(tempDir.resolve("packages/b"));
    Path packageALcov = packageADir.resolve("lcov.info");
    Path packageBLcov = packageBDir.resolve("lcov.info");
    Files.write(
      packageALcov,
      String.join("\n", "SF:src/index.ts", "DA:1,1", "end_of_record", "").getBytes(
        StandardCharsets.UTF_8
      )
    );
    Files.write(
      packageBLcov,
      String.join("\n", "SF:src/index.ts", "DA:5,1", "end_of_record", "").getBytes(
        StandardCharsets.UTF_8
      )
    );

    settings.setProperty(
      JavaScriptPlugin.LCOV_REPORT_PATHS,
      packageALcov.toAbsolutePath() + "," + packageBLcov.toAbsolutePath()
    );
    coverageSensor.execute(context);

    assertThat(context.lineHits(packageA.key(), 1)).isEqualTo(1);
    assertThat(context.lineHits(packageB.key(), 5)).isEqualTo(1);
    assertThat(logTester.logs(Level.DEBUG)).noneMatch(log ->
      log.contains("Line with number 5 doesn't belong to file index.ts")
    );
  }

  @Test
  void should_resolve_package_relative_lcov_paths_against_report_ancestor_directories()
    throws Exception {
    DefaultInputFile packageA = tsInputFile(
      "packages/a/src/index.ts",
      String.join(
          "\n",
          "export const fromA = 1;",
          "export function fromPackageA() {",
          "  return fromA;",
          "}"
        ) +
        "\n"
    );
    DefaultInputFile packageB = tsInputFile(
      "packages/b/src/index.ts",
      String.join(
          "\n",
          "export const fromB = 1;",
          "export function fromPackageB() {",
          "  return fromB + 1;",
          "}",
          "export const uncoveredButCounted = fromB + 2;"
        ) +
        "\n"
    );

    Path packageACoverageDir = Files.createDirectories(tempDir.resolve("packages/a/coverage"));
    Path packageBCoverageDir = Files.createDirectories(tempDir.resolve("packages/b/coverage"));
    Path packageALcov = packageACoverageDir.resolve("lcov.info");
    Path packageBLcov = packageBCoverageDir.resolve("lcov.info");
    Files.write(
      packageALcov,
      String.join("\n", "SF:src/index.ts", "DA:1,1", "end_of_record", "").getBytes(
        StandardCharsets.UTF_8
      )
    );
    Files.write(
      packageBLcov,
      String.join("\n", "SF:src/index.ts", "DA:5,1", "end_of_record", "").getBytes(
        StandardCharsets.UTF_8
      )
    );

    settings.setProperty(
      JavaScriptPlugin.LCOV_REPORT_PATHS,
      packageALcov.toAbsolutePath() + "," + packageBLcov.toAbsolutePath()
    );
    coverageSensor.execute(context);

    assertThat(context.lineHits(packageA.key(), 1)).isEqualTo(1);
    assertThat(context.lineHits(packageB.key(), 5)).isEqualTo(1);
    assertThat(logTester.logs(Level.DEBUG)).noneMatch(log ->
      log.contains("Ambiguous LCOV path 'src/index.ts'")
    );
  }

  @Test
  void should_guess_when_duplicate_suffix_match_is_ambiguous() throws Exception {
    DefaultInputFile packageA = tsInputFile(
      "packages/a/src/index.ts",
      String.join(
          "\n",
          "export const fromA = 1;",
          "export function fromPackageA() {",
          "  return fromA;",
          "}"
        ) +
        "\n"
    );
    DefaultInputFile packageB = tsInputFile(
      "packages/b/src/index.ts",
      String.join(
          "\n",
          "export const fromB = 1;",
          "export function fromPackageB() {",
          "  return fromB + 1;",
          "}",
          "export const uncoveredButCounted = fromB + 2;"
        ) +
        "\n"
    );

    Path lcov = tempDir.resolve("duplicate-suffix-relative.lcov");
    Files.write(
      lcov,
      String.join(
        "\n",
        "SF:src/index.ts",
        "DA:1,1",
        "end_of_record",
        "SF:src/index.ts",
        "DA:5,1",
        "end_of_record",
        ""
      ).getBytes(StandardCharsets.UTF_8)
    );

    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, lcov.toAbsolutePath().toString());
    coverageSensor.execute(context);

    assertThat(context.lineHits(packageA.key(), 1)).isEqualTo(1);
    assertThat(context.lineHits(packageB.key(), 5)).isNull();
    assertThat(logTester.logs(Level.DEBUG)).anyMatch(
      log ->
        log.contains("Ambiguous LCOV path 'src/index.ts'") &&
        log.contains("falling back to 'packages/a/src/index.ts'")
    );
  }

  @Test
  void should_import_duplicate_suffix_files_when_lcov_uses_absolute_paths() throws Exception {
    DefaultInputFile packageA = tsInputFile(
      "packages/a/src/index.ts",
      String.join(
          "\n",
          "export const fromA = 1;",
          "export function fromPackageA() {",
          "  return fromA;",
          "}"
        ) +
        "\n"
    );
    DefaultInputFile packageB = tsInputFile(
      "packages/b/src/index.ts",
      String.join(
          "\n",
          "export const fromB = 1;",
          "export function fromPackageB() {",
          "  return fromB + 1;",
          "}",
          "export const uncoveredButCounted = fromB + 2;"
        ) +
        "\n"
    );

    Path lcov = tempDir.resolve("duplicate-suffix-absolute.lcov");
    Files.write(
      lcov,
      String.join(
        "\n",
        "SF:" + packageA.absolutePath(),
        "DA:1,1",
        "end_of_record",
        "SF:" + packageB.absolutePath(),
        "DA:5,1",
        "end_of_record",
        ""
      ).getBytes(StandardCharsets.UTF_8)
    );

    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, lcov.toAbsolutePath().toString());
    coverageSensor.execute(context);

    assertThat(context.lineHits(packageA.key(), 1)).isEqualTo(1);
    assertThat(context.lineHits(packageB.key(), 5)).isEqualTo(1);
  }

  @Test
  void should_import_absolute_paths_when_analysis_base_dir_is_an_alias() throws Exception {
    Path realBaseDir = Files.createDirectories(tempDir.resolve("real-base-dir"));
    Path analysisBaseDir = createDirectoryAlias(tempDir.resolve("analysis-base-dir"), realBaseDir);

    settings = new MapSettings();
    context = SensorContextTester.create(analysisBaseDir.toFile());
    context.setSettings(settings);

    DefaultInputFile packageA = tsInputFile(
      realBaseDir,
      "packages/a/src/index.ts",
      String.join(
          "\n",
          "export const fromA = 1;",
          "export function fromPackageA() {",
          "  return fromA;",
          "}"
        ) +
        "\n"
    );

    Path lcov = analysisBaseDir.resolve("duplicate-suffix-absolute-alias.lcov");
    Files.write(
      lcov,
      String.join("\n", "SF:" + packageA.absolutePath(), "DA:1,1", "end_of_record", "").getBytes(
        StandardCharsets.UTF_8
      )
    );

    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, lcov.toAbsolutePath().toString());
    coverageSensor.execute(context);

    assertThat(context.lineHits(packageA.key(), 1)).isEqualTo(1);
  }

  @Test
  void should_import_absolute_paths_when_lcov_uses_an_alias_of_analysis_base_dir()
    throws Exception {
    Path realBaseDir = Files.createDirectories(tempDir.resolve("real-base-dir"));
    Path analysisBaseDirAlias = createDirectoryAlias(
      tempDir.resolve("analysis-base-dir-alias"),
      realBaseDir
    );

    settings = new MapSettings();
    context = SensorContextTester.create(realBaseDir.toFile());
    context.setSettings(settings);

    DefaultInputFile packageA = tsInputFile(
      realBaseDir,
      "packages/a/src/index.ts",
      String.join(
          "\n",
          "export const fromA = 1;",
          "export function fromPackageA() {",
          "  return fromA;",
          "}"
        ) +
        "\n"
    );

    Path lcov = realBaseDir.resolve("duplicate-suffix-absolute-alias-spelling.lcov");
    Files.write(
      lcov,
      String.join(
        "\n",
        "SF:" + analysisBaseDirAlias.resolve("packages/a/src/index.ts").toAbsolutePath(),
        "DA:1,1",
        "end_of_record",
        ""
      ).getBytes(StandardCharsets.UTF_8)
    );

    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATHS, lcov.toAbsolutePath().toString());
    coverageSensor.execute(context);

    assertThat(context.lineHits(packageA.key(), 1)).isEqualTo(1);
  }

  private DefaultInputFile tsInputFile(String relativePath, String contents) {
    return tsInputFile(tempDir, relativePath, contents);
  }

  private DefaultInputFile tsInputFile(Path moduleBaseDir, String relativePath, String contents) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(moduleBaseDir)
      .setLanguage("ts")
      .setContents(contents)
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }

  private static Path createDirectoryAlias(Path alias, Path target) throws Exception {
    if (isWindows()) {
      Process process = new ProcessBuilder(
        "cmd",
        "/c",
        String.format("mklink /J \"%s\" \"%s\"", alias, target)
      )
        .redirectErrorStream(true)
        .start();
      String output;
      try (var reader = process.inputReader(StandardCharsets.UTF_8)) {
        output = reader.lines().reduce("", (left, right) -> left + right + System.lineSeparator());
      }
      assumeTrue(
        process.waitFor() == 0,
        () -> "Unable to create directory junction for test: " + output
      );
      return alias;
    }

    try {
      return Files.createSymbolicLink(alias, target);
    } catch (IOException | UnsupportedOperationException e) {
      assumeTrue(false, () -> "Unable to create directory alias for test: " + e.getMessage());
      return alias;
    }
  }

  private static boolean isWindows() {
    return System.getProperty("os.name").startsWith("Windows");
  }
}
