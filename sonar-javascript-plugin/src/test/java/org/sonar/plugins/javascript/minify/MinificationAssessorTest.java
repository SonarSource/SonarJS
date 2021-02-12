/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.minify;

import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import org.assertj.core.api.AbstractBooleanAssert;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

import static org.assertj.core.api.Assertions.assertThat;

public class MinificationAssessorTest {

  private final static String DIR = "src/test/resources/minify/";

  @org.junit.Rule
  public final ExpectedException thrown = ExpectedException.none();

  @Test
  public void assessOnFileName() {
    // the files below do not exist on the file system, as we just test their name - not their contents
    getAssert("file.min.js").isTrue();
    getAssert("file-min.js").isTrue();
    getAssert("file.not-js").isFalse();
  }

  @Test
  public void assessOnFileContents() {
    getAssert("file1.js").isFalse();
    getAssert("file2.js").isTrue();
    getAssert("file4.js").isFalse();
    getAssert("file5.js").isTrue();
  }

  @Test
  public void assessNonExistingFile() {
    thrown.expect(IllegalStateException.class);
    getAssert("file-does-not-exist.js").isFalse();
  }

  @Test
  public void assessEmptyFile() {
    getAssert("empty.js").isFalse();
  }

  @Test
  public void assessWithDefaultConstructor() {
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

  private AbstractBooleanAssert getAssert(String fileName) {
    MinificationAssessor assessor = new MinificationAssessor(20);
    return getAssert(assessor, fileName);
  }

  private AbstractBooleanAssert getAssert(MinificationAssessor assessor, String fileName) {
    return assertThat(assessor.isMinified(getFile(fileName))).as("File '" + fileName + "' is minified?");
  }

}
