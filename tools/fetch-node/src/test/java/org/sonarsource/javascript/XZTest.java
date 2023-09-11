package org.sonarsource.javascript;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

import java.io.BufferedInputStream;
import java.io.File;
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

  private final String FILENAME = "foo.txt";
  private final String origFilename = getClass().getClassLoader().getResource(FILENAME).getPath();

  @BeforeEach
  void before() throws IOException {
    Files.copy(Path.of(origFilename), Path.of(tempDir.toString(), FILENAME));
  }

  @Test
  void should_compress_files() {
    var copyPath = Path.of(tempDir.toString(), FILENAME);
    var origFile = new File(origFilename);
    try {
      XZ.compress(new String[] { copyPath.toString() }, 1);
      var compressedFilename = copyPath + ".xz";
      assertThat(Files.exists(Path.of(compressedFilename)));
      assertThat(Files.notExists(copyPath));
      var compressedFile = new File(compressedFilename);
      assertThat(compressedFile.length()).isLessThan(origFile.length());

      extract(compressedFilename);
      assertThat(Files.exists(copyPath));
      var extractedFile = new File(copyPath.toString());
      assertThat(origFile.length()).isEqualTo(extractedFile.length());
      var origContents = new String(Files.readAllBytes(Path.of(origFilename)));
      var extractedContents = new String(Files.readAllBytes(copyPath));
      assertThat(extractedContents).isEqualTo(origContents);
    } catch (Exception e) {
      fail("Error thrown when compressing: " + e.getMessage());
    }
  }

  @Test
  void should_throw_an_error_if_a_filename_doesnt_exists() {
    var filename = "foobar";
    try {
      XZ.compress(new String[] { filename });
      fail("Should have thrown.");
    } catch (IOException e) {
      assertThat(e.getMessage()).isEqualTo("File " + filename + " does not exist.");
    }
  }

  //@Test
  /*void should_throw_an_error_if_file_deletion_is_forbidden() {
    var copyPath = Path.of(tempDir.toString(), FILENAME);
    try (MockedStatic<Files> files = Mockito.mockStatic(Files.class)) {
      files.when(() -> Files.delete(copyPath)).thenThrow(new IOException("foobar"));
      XZ.compress(new String[] {copyPath.toString()});
      fail("Should have thrown.");
    } catch (IOException e) {
      assertThat(e.getMessage()).isEqualTo("Error while deleting file: foobar");
    }
  }*/

  private void extract(String source) throws IOException {
    var target = Path.of(source.substring(0, source.length() - 3));
    try (
      var is = Files.newInputStream(Path.of(source));
      var stream = new BufferedInputStream(is);
      var archive = new XZInputStream(stream);
      var os = Files.newOutputStream(target);
    ) {
      int nextBytes;
      byte[] buf = new byte[8 * 1024 * 1024];
      while ((nextBytes = archive.read(buf)) > -1) {
        System.out.println("read " + nextBytes + " bytes");
        os.write(buf, 0, nextBytes);
      }
    }
  }
}
