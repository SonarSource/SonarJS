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
import javax.annotation.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.css.CssLanguage;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileSystem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent.Type.CREATED;
import static org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent.Type.DELETED;
import static org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent.Type.MODIFIED;

class SonarLintJavaScriptIndexerTest {

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
  void should_index_javascript_files() throws IOException {
    var indexer = sonarLintJavaScriptIndexer(
      inputFile("file.js", "function foo() {}"),
      inputFile("file.css", "h1 { font-weight: bold }", CssLanguage.KEY)
    );

    assertThat(indexer.getIndexedFiles()).hasSize(1);
    assertThat(logTester.logs()).containsExactly("Input files for indexing: [file.js]");
  }

  @Test
  void should_add_files() throws IOException {
    var indexer = sonarLintJavaScriptIndexer(inputFile("file1.js", "function foo() {}"));

    indexer.process(moduleFileEvent(inputFile("file2.js", "function bar() {}"), CREATED));

    assertThat(indexer.getIndexedFiles()).hasSize(2);
    assertThat(logTester.logs()).containsExactly(
      "Input files for indexing: [file1.js]",
      "Adding file from index: file2.js"
    );
  }

  @Test
  void should_remove_files() throws IOException {
    var indexer = sonarLintJavaScriptIndexer(inputFile("file1.js", "function foo() {}"));

    indexer.process(moduleFileEvent(inputFile("file1.js"), DELETED));

    assertThat(indexer.getIndexedFiles()).isEmpty();
    assertThat(logTester.logs()).containsExactly(
      "Input files for indexing: [file1.js]",
      "Removing file from index: file1.js"
    );
  }

  @Test
  void should_ignore_updated_files() throws IOException {
    var indexer = sonarLintJavaScriptIndexer(inputFile("file.js", "function foo() {}"));

    indexer.process(moduleFileEvent(inputFile("file.js"), MODIFIED));

    assertThat(indexer.getIndexedFiles()).hasSize(1);
    assertThat(logTester.logs()).containsExactly("Input files for indexing: [file.js]");
  }

  private SonarLintJavaScriptIndexer sonarLintJavaScriptIndexer(InputFile... inputFiles) {
    var indexer = new SonarLintJavaScriptIndexer(moduleFileSystem(inputFiles));
    indexer.buildOnce(sensorContext());
    return indexer;
  }

  private ModuleFileEvent moduleFileEvent(InputFile inputFile, ModuleFileEvent.Type type) {
    var event = mock(ModuleFileEvent.class);
    when(event.getTarget()).thenReturn(inputFile);
    when(event.getType()).thenReturn(type);
    return event;
  }

  private SensorContext sensorContext() {
    var context = mock(SensorContext.class);
    when(context.fileSystem()).thenReturn(new DefaultFileSystem(baseDir));
    return context;
  }

  private InputFile inputFile(String filename) throws IOException {
    return inputFile(filename, null, JavaScriptLanguage.KEY);
  }

  private InputFile inputFile(String filename, @Nullable String contents) throws IOException {
    return inputFile(filename, contents, JavaScriptLanguage.KEY);
  }

  private InputFile inputFile(String filename, @Nullable String contents, String language) throws IOException {
    var file = mock(InputFile.class);
    when(file.language()).thenReturn(language);
    when(file.contents()).thenReturn(contents);
    when(file.filename()).thenReturn(filename);
    when(file.uri()).thenReturn(baseDir.resolve(filename).toUri());
    return file;
  }

}
