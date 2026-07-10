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

import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonarsource.scanner.engine.sensor.test.fixtures.TestInputFileBuilder;
import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;

class FileLocatorTest {

  @Test
  void should_match_suffix() {
    InputFile inputFile = new TestInputFileBuilder(
      "module1",
      "src/main/java/org/sonar/test/File.java"
    ).build();
    FileLocator locator = new FileLocator(Collections.singleton(inputFile));
    assertThat(locator.getInputFile("org/sonar/test/File.java")).isEqualTo(inputFile);
  }

  @Test
  void should_not_match() {
    InputFile inputFile = new TestInputFileBuilder(
      "module1",
      "src/main/java/org/sonar/test/File.java"
    ).build();
    FileLocator locator = new FileLocator(Collections.singleton(inputFile));
    assertThat(locator.getInputFile("org/sonar/test/File2.java")).isNull();
    assertThat(locator.getInputFile("org/sonar/test2/File.java")).isNull();
    assertThat(locator.getInputFile("not/found")).isNull();
  }

  @Test
  void should_match_first_with_many_options_and_mark_as_guess() {
    InputFile inputFile1 = new TestInputFileBuilder(
      "module1",
      "src/main/java/org/sonar/test/File.java"
    ).build();
    InputFile inputFile2 = new TestInputFileBuilder(
      "module1",
      "src/test/java/org/sonar/test/File.java"
    ).build();

    FileLocator locator = new FileLocator(Arrays.asList(inputFile1, inputFile2));
    FileLocator.Resolution resolution = locator.resolve("org/sonar/test/File.java");
    assertThat(resolution.inputFile()).isEqualTo(inputFile1);
    assertThat(resolution.guessed()).isTrue();
  }

  @Test
  void should_prefer_exact_suffix_node_over_deeper_leaf() {
    InputFile inputFile1 = new TestInputFileBuilder("module1", "lib/src/index.ts").build();
    InputFile inputFile2 = new TestInputFileBuilder(
      "module1",
      "packages/a/lib/src/index.ts"
    ).build();

    FileLocator locator = new FileLocator(Arrays.asList(inputFile1, inputFile2));
    FileLocator.Resolution resolution = locator.resolve("lib/src/index.ts");
    assertThat(resolution.inputFile()).isEqualTo(inputFile1);
    assertThat(resolution.guessed()).isTrue();
  }

  @Test
  void should_normalize_paths() {
    InputFile inputFile = new TestInputFileBuilder(
      "module1",
      "src/main/java/org/sonar/test/File.java"
    ).build();

    FileLocator locator = new FileLocator(singletonList(inputFile));
    assertThat(locator.getInputFile("./org/sonar/test/File.java")).isEqualTo(inputFile);
    assertThat(locator.getInputFile("./org//sonar/./test/File.java")).isEqualTo(inputFile);
    assertThat(locator.getInputFile("./org//sonar/../sonar/test/File.java")).isEqualTo(inputFile);
    assertThat(locator.getInputFile("///a/b/c.txt")).isNull();
  }
}
