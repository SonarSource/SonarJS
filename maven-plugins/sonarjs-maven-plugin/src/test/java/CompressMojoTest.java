/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.tukaani.xz.XZInputStream;

class CompressMojoTest {
  //
  //  @TempDir
  //  Path tempDir;
  //
  //  /**
  //   * this needs to be long enough so that it's shorter compressed
  //   */
  //  private final String FILE_CONTENT =
  //    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  //  private Path origFilePath;
  //
  //  @BeforeEach
  //  void before() throws IOException {
  //    origFilePath = tempDir.resolve("foo.txt");
  //    Files.write(origFilePath, FILE_CONTENT.getBytes());
  //  }
  //
  //  @Test
  //  void should_compress_files() throws Exception {
  //    var origSize = Files.size(origFilePath);
  //    CompressMojo.main(new String[] { origFilePath.toString() });
  //    var compressedFilePath = Path.of(origFilePath + ".xz");
  //    assertThat(compressedFilePath).exists();
  //    assertThat(origFilePath).doesNotExist();
  //    assertThat(Files.size(compressedFilePath)).isLessThan(origSize);
  //
  //    extract(compressedFilePath);
  //    assertThat(origFilePath).exists();
  //    assertThat(origSize).isEqualTo(Files.size(origFilePath));
  //    var extractedContents = Files.readString(origFilePath);
  //    assertThat(extractedContents).isEqualTo(FILE_CONTENT);
  //  }
  //
  //  @Test
  //  void should_throw_an_error_if_a_filename_doesnt_exists() {
  //    List<String> filenames = List.of("foobar");
  //    assertThatThrownBy(() -> CompressMojo.compress(filenames)).hasMessage(
  //      "File " + filenames.get(0) + " does not exist."
  //    );
  //  }
  //
  //  @Test
  //  void output_already_exists() throws Exception {
  //    var f = Files.createFile(Path.of(origFilePath + ".xz"));
  //    CompressMojo.main(new String[] { origFilePath.toString() });
  //    assertThat(Files.size(f)).isZero();
  //  }
  //
  //  @Test
  //  void no_args() {
  //    assertThatThrownBy(() -> CompressMojo.main(new String[] {})).hasMessage(
  //      "Please provide at least 1 filename to compress using XZ"
  //    );
  //  }
  //
  //  /**
  //   * Extracts the given `source.xz` to `source` (without the `.xz` extension)
  //   *
  //   * @param source
  //   * @throws IOException
  //   */
  //  private void extract(Path source) throws IOException {
  //    var sourceAsString = source.toString();
  //    var target = Path.of(sourceAsString.substring(0, sourceAsString.length() - 3));
  //    try (
  //      var is = Files.newInputStream(source);
  //      var stream = new BufferedInputStream(is);
  //      var archive = new XZInputStream(stream);
  //      var os = Files.newOutputStream(target);
  //    ) {
  //      archive.transferTo(os);
  //    }
  //  }
}
