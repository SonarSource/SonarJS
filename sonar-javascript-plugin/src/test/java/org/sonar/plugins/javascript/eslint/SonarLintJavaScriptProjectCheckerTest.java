/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Optional;
import javax.annotation.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.css.CssLanguage;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileSystem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.eslint.SonarLintJavaScriptProjectChecker.MAX_LINES_PROPERTY;

class SonarLintJavaScriptProjectCheckerTest {

  @RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @TempDir
  Path baseDir;

  private static ModuleFileSystem moduleFileSystem(InputFile... inputFiles) {
    var moduleFileSystem = mock(ModuleFileSystem.class);
    when(moduleFileSystem.files()).thenReturn(Arrays.stream(inputFiles));
    return moduleFileSystem;
  }

  @BeforeEach
  void setUp() {
    logTester.setLevel(LoggerLevel.DEBUG);
  }

  @Test
  void should_check_javascript_files() throws IOException {
    var checker = sonarLintJavaScriptProjectChecker(
      inputFile("file.js", "function foo() {}", JavaScriptLanguage.KEY, 1),
      inputFile("file.css", "h1 {\n  font-weight: bold;\n}", CssLanguage.KEY, 3)
    );

    assertThat(checker.isBeyondLimit()).isFalse();
    assertThat(logTester.logs()).containsExactly("Project type checking for JavaScript files activated as project size (total number of lines is 1, maximum is 1000000)");
  }

  @Test
  void should_check_detect_too_big_projects() throws IOException {
    var checker = sonarLintJavaScriptProjectChecker(
      inputFile("file.js", "function foo() {}", JavaScriptLanguage.KEY, 1000000),
      inputFile("file.css", "h1 {\n  font-weight: bold;\n}", CssLanguage.KEY, 3)
    );

    assertThat(checker.isBeyondLimit()).isTrue();
    assertThat(logTester.logs()).containsExactly("Project type checking for JavaScript files deactivated due to project size (maximum is 1000000)",
      "Update \"sonar.javascript.sonarlint.type.maxlines\" to set a different limit.");
  }

  private SonarLintJavaScriptProjectChecker sonarLintJavaScriptProjectChecker(InputFile... inputFiles) {
    var checker = new SonarLintJavaScriptProjectChecker(moduleFileSystem(inputFiles));
    checker.checkOnce(sensorContext());
    return checker;
  }

  private SensorContext sensorContext() {
    var config = mock(Configuration.class);
    when(config.get(MAX_LINES_PROPERTY)).thenReturn(Optional.of("10"));

    var context = mock(SensorContext.class);
    when(context.config()).thenReturn(config);
    when(context.fileSystem()).thenReturn(new DefaultFileSystem(baseDir));
    return context;
  }

  private InputFile inputFile(String filename, @Nullable String contents, String language, Integer lines) throws IOException {
    var file = mock(InputFile.class);
    when(file.language()).thenReturn(language);
    when(file.contents()).thenReturn(contents);
    when(file.filename()).thenReturn(filename);
    when(file.uri()).thenReturn(baseDir.resolve(filename).toUri());
    when(file.lines()).thenReturn(lines);
    return file;
  }

}
