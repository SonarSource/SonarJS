/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis.cache;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;

class FileMetadataTest {

  @Test
  void test() throws Exception {
    var file = TestInputFileBuilder
      .create("module", "file.ts")
      .setContents("abc")
      .setCharset(StandardCharsets.UTF_8)
      .build();

    var same = TestInputFileBuilder
      .create("module", "file.ts")
      .setContents("abc")
      .setCharset(StandardCharsets.UTF_8)
      .build();

    var metadata = FileMetadata.from(file);
    assertThat(metadata.compareTo(same)).isTrue();

    var diffSize = TestInputFileBuilder
      .create("module", "file.ts")
      .setContents("a")
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(metadata.compareTo(diffSize)).isFalse();

    var diffContent = TestInputFileBuilder
      .create("module", "file.ts")
      .setContents("def")
      .setCharset(StandardCharsets.UTF_8)
      .build();
    assertThat(metadata.compareTo(diffContent)).isFalse();
  }
}
