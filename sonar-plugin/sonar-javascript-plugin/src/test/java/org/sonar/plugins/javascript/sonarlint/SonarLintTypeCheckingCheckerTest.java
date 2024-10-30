/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.sonarlint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.sonarlint.SonarLintTypeCheckingCheckerImpl.DEFAULT_MAX_FILES_FOR_TYPE_CHECKING;
import static org.sonar.plugins.javascript.sonarlint.SonarLintTypeCheckingCheckerImpl.MAX_FILES_PROPERTY;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.config.Configuration;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;

class SonarLintTypeCheckingCheckerTest {

  @RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @TempDir
  Path baseDir;

  @Test
  void should_check_javascript_files() throws IOException {
    logTester.setLevel(LoggerLevel.INFO);
    inputFile("file.js");
    inputFile("file.css");
    inputFile("file.d.ts");
    inputFile("node_modules", "dep.js");

    var checker = new SonarLintTypeCheckingCheckerImpl();
    assertThat(checker.isBeyondLimit(sensorContext(3))).isFalse();
    assertThat(logTester.logs()).contains("Turning on type-checking of JavaScript files");
  }

  @Test
  void should_detect_projects_with_too_many_files() throws IOException {
    logTester.setLevel(LoggerLevel.WARN);
    inputFile("file1.js");
    inputFile("file2.ts");
    inputFile("file3.cjs");
    inputFile("file4.cts");
    var checker = new SonarLintTypeCheckingCheckerImpl();

    assertThat(checker.isBeyondLimit(sensorContext(3))).isTrue();
    assertThat(logTester.logs())
      .contains(
        "Turning off type-checking of JavaScript files due to the project size exceeding the limit (3 files)",
        "This may cause rules dependent on type information to not behave as expected",
        "Check the list of impacted rules at https://rules.sonarsource.com/javascript/tag/type-dependent",
        "To turn type-checking back on, increase the \"" + MAX_FILES_PROPERTY + "\" property value",
        "Please be aware that this could potentially impact the performance of the analysis"
      );
  }

  @Test
  void should_detect_errors() {
    logTester.setLevel(LoggerLevel.WARN);
    var checker = new SonarLintTypeCheckingCheckerImpl();
    var context = sensorContext();
    when(context.fileSystem().baseDir()).thenThrow(new IllegalArgumentException());

    assertThat(checker.isBeyondLimit(context)).isTrue();
    assertThat(logTester.logs())
      .containsExactly("Turning off type-checking of JavaScript files due to unexpected error");
  }

  private SensorContext sensorContext() {
    return sensorContext(DEFAULT_MAX_FILES_FOR_TYPE_CHECKING);
  }

  private SensorContext sensorContext(int maxFiles) {
    var config = mock(Configuration.class);
    when(config.getInt(MAX_FILES_PROPERTY)).thenReturn(Optional.of(maxFiles));

    var context = mock(SensorContext.class);
    when(context.config()).thenReturn(config);
    when(context.fileSystem()).thenReturn(new DefaultFileSystem(baseDir));
    return context;
  }

  private void inputFile(String filename) throws IOException {
    var path = baseDir.resolve(filename);
    Files.writeString(path, "inputFile");
  }

  private Path inputFile(String dir, String filename) throws IOException {
    var path = Files.createDirectories(baseDir.resolve(dir)).resolve(filename);
    Files.writeString(path, "inputFile");
    return path;
  }
}
