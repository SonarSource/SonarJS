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
package org.sonar.plugins.javascript.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import org.assertj.core.api.AbstractBooleanAssert;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

class MinificationAssessorTest {

  private static final String DIR = "src/test/resources/minify/";

  @Test
  void assessOnFileName() {
    // the files below do not exist on the file system, as we just test their name - not their contents
    getAssert("file.min.js").isTrue();
    getAssert("file-min.js").isTrue();
    getAssert("file.not-js").isFalse();
    getAssert("file.min.css").isTrue();
    getAssert("file-min.css").isTrue();
  }

  @Test
  void assessOnFileContents() {
    getAssert("file1.js").isFalse();
    getAssert("file2.js").isTrue();
    getAssert("file4.js").isFalse();
    getAssert("file5.js").isTrue();
    getAssert("file1.css").isFalse();
    getAssert("file2.css").isTrue();
  }

  @Test
  void assessNonExistingFile() {
    var assessor = new MinificationAssessor(20);
    var file = getFile("file-does-not-exist.js");
    assertThatThrownBy(() -> assessor.isMinified(file)).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void assessEmptyFile() {
    getAssert("empty.js").isFalse();
  }

  @Test
  void assessWithDefaultConstructor() {
    MinificationAssessor assessor = new MinificationAssessor();
    getAssert(assessor, "file2.js").isFalse();
  }

  private InputFile getFile(String name) {
    DefaultInputFile inputFile = new TestInputFileBuilder("module1", DIR + name)
      .setModuleBaseDir(Paths.get(""))
      .setCharset(StandardCharsets.UTF_8)
      .build();
    return inputFile;
  }

  private AbstractBooleanAssert<?> getAssert(String fileName) {
    MinificationAssessor assessor = new MinificationAssessor(20);
    return getAssert(assessor, fileName);
  }

  private AbstractBooleanAssert<?> getAssert(MinificationAssessor assessor, String fileName) {
    return assertThat(assessor.isMinified(getFile(fileName)))
      .as("File '" + fileName + "' is minified?");
  }
}
