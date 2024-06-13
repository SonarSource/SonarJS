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
package org.sonar.plugins.javascript.standalone;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;

class StandaloneTemporaryFolderTest {.StandaloneParser

  private static final StandaloneTemporaryFolder STANDALONE_TEMPORARY_FOLDER = new StandaloneTemporaryFolder();

  @Test
  void new_dir_can_throw() {
    try (MockedStatic<Files> mockedFiles = Mockito.mockStatic(Files.class)) {
      mockedFiles.when(() -> Files.createTempDirectory(any(String.class))).thenThrow(new IOException("IOException!"));
      assertThatThrownBy(STANDALONE_TEMPORARY_FOLDER::newDir)
        .isInstanceOf(UncheckedIOException.class)
        .hasMessage("java.io.IOException: IOException!");
    }
  }

  @Test
  void new_file_can_throw() {
    try (MockedStatic<Files> mockedFiles = Mockito.mockStatic(Files.class)) {
      mockedFiles.when(() -> Files.createTempFile(any(), any())).thenThrow(new IOException("IOException!"));
      assertThatThrownBy(STANDALONE_TEMPORARY_FOLDER::newFile)
        .isInstanceOf(UncheckedIOException.class)
        .hasMessage("java.io.IOException: IOException!");
    }
  }

}
