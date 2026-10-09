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
package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.gson.JsonObject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.sonar.api.batch.fs.InputFile;

class ReplayProjectPathsTest {

  @TempDir
  Path temporary;

  @Test
  void reads_the_shared_schema_without_requiring_the_original_directory() throws IOException {
    var root = temporary.resolve("unavailable");
    var paths = ReplayProjectPaths.read(metadata(root.toString()));
    assertThat(root).doesNotExist();
    assertThat(paths.baseDir()).isEqualTo(root.toString().replace('\\', '/'));
    var file = mock(InputFile.class);
    when(file.relativePath()).thenReturn("src/file.test.ts");
    assertThat(paths.filePath(file)).isEqualTo(paths.baseDir() + "/src/file.test.ts");
    when(file.relativePath()).thenReturn("../outside.ts");
    assertThatThrownBy(() -> paths.filePath(file)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void treats_legacy_metadata_as_unsupported() throws IOException {
    assertThat(ReplayProjectPaths.read("{}")).isNull();
  }

  @ParameterizedTest
  @ValueSource(
    strings = {
      "relative/project",
      "C:",
      "C:project",
      "\\ci\\project",
      "//server",
      "//?/C:/project",
    }
  )
  void rejects_a_relative_or_device_recorded_root(String root) throws IOException {
    var metadata = metadata(root);
    assertThatThrownBy(() -> ReplayProjectPaths.read(metadata)).isInstanceOf(
      IllegalArgumentException.class
    );
  }

  @ParameterizedTest
  @ValueSource(
    strings = {
      "C:/ci/project",
      "d:\\ci\\project",
      "/home/ci/project",
      "//server/share/project",
      "C:/",
      "/",
    }
  )
  void transports_both_operating_system_namespaces_without_native_resolution(String root)
    throws IOException {
    var paths = ReplayProjectPaths.read(metadata(root));
    assertThat(paths.baseDir()).isEqualTo(root.replace('\\', '/'));
    var file = mock(InputFile.class);
    when(file.relativePath()).thenReturn("src\\sub\\..\\file.ts");
    var normalized = root.replace('\\', '/');
    assertThat(paths.filePath(file)).isEqualTo(
      normalized + (normalized.endsWith("/") ? "" : "/") + "src/file.ts"
    );
  }

  @ParameterizedTest
  @ValueSource(
    strings = {
      "../file.ts",
      "..\\file.ts",
      "/outside.ts",
      "C:/outside.ts",
      "D:outside.ts",
      "//server/share/file.ts",
      "src/../../outside.ts",
    }
  )
  void rejects_file_escapes_on_every_operating_system(String relative) throws IOException {
    var paths = ReplayProjectPaths.read(metadata("C:/ci/project"));
    var file = mock(InputFile.class);
    when(file.relativePath()).thenReturn(relative);
    assertThatThrownBy(() -> paths.filePath(file)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejects_corrupt_metadata() throws IOException {
    assertThatThrownBy(() -> ReplayProjectPaths.read("not json")).isInstanceOf(
      RuntimeException.class
    );
    assertThatThrownBy(() -> ReplayProjectPaths.read("{\"baseDir\":\"/project\"}")).isInstanceOf(
      IllegalArgumentException.class
    );
  }

  private String metadata(String baseDir) {
    var metadata = new JsonObject();
    var configuration = new JsonObject();
    configuration.addProperty("baseDir", baseDir);
    metadata.add("configuration", configuration);
    return metadata.toString();
  }
}
