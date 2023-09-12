package org.sonarsource.javascript;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.tukaani.xz.XZInputStream;

public class XZTest {

  @TempDir
  Path tempDir;

  /**
   * this needs to be long enough so that it's shorter compressed
   */
  private final String FILE_CONTENT =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  private Path origFilePath;

  @BeforeEach
  void before() throws IOException {
    origFilePath = tempDir.resolve("foo.txt");
    Files.write(origFilePath, FILE_CONTENT.getBytes());
  }

  @Test
  void should_compress_files() throws Exception {
    var origSize = Files.size(origFilePath);
    XZ.main(new String[] { origFilePath.toString() });
    var compressedFilePath = Path.of(origFilePath + ".xz");
    assertThat(compressedFilePath).exists();
    assertThat(origFilePath).doesNotExist();
    assertThat(Files.size(compressedFilePath)).isLessThan(origSize);

    extract(compressedFilePath);
    assertThat(origFilePath).exists();
    assertThat(origSize).isEqualTo(Files.size(origFilePath));
    var extractedContents = Files.readString(origFilePath);
    assertThat(extractedContents).isEqualTo(FILE_CONTENT);
  }

  @Test
  void should_throw_an_error_if_a_filename_doesnt_exists() {
    String[] filenames = { "foobar" };
    assertThatThrownBy(() -> XZ.compress(filenames))
      .hasMessage("File " + filenames[0] + " does not exist.");
  }

  /**
   * Extracts the given `source.xz` to `source` (without the `.xz` extension)
   *
   * @param source
   * @throws IOException
   */
  private void extract(Path source) throws IOException {
    var sourceAsString = source.toString();
    var target = Path.of(sourceAsString.substring(0, sourceAsString.length() - 3));
    try (
      var is = Files.newInputStream(source);
      var stream = new BufferedInputStream(is);
      var archive = new XZInputStream(stream);
      var os = Files.newOutputStream(target);
    ) {
      archive.transferTo(os);
    }
  }
}
