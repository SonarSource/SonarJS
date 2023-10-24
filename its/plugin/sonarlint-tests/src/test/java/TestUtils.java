/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2023 SonarSource SA
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

import static java.util.Objects.requireNonNull;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.regex.Pattern;
import org.sonarsource.sonarlint.core.analysis.api.ClientInputFile;

public class TestUtils {

  static final Path JAVASCRIPT_PLUGIN_LOCATION = artifact();

  /**
   * This is used to test artifact with and without embedded runtime during plugin QA integration tests
   *
   */
  private static Path artifact() {
    var target = homeDir()
      .resolve("../../../../../../sonar-plugin/sonar-javascript-plugin/target")
      .normalize();
    try (var stream = Files.walk(target, 1)) {
      return stream
        .filter(p -> pluginFilenameMatcher().matcher(p.getFileName().toString()).matches())
        .findAny()
        .orElseThrow(() -> new IllegalStateException("Cannot find plugin artifact in " + target));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private static Pattern pluginFilenameMatcher() {
    return "multi".equals(System.getenv("SONARJS_ARTIFACT"))
      ? Pattern.compile("sonar-javascript-plugin-.*-multi\\.jar")
      : Pattern.compile("sonar-javascript-plugin-[0-9.]*(?:-SNAPSHOT)?\\.jar");
  }

  public static Path homeDir() {
    try {
      return Path.of(requireNonNull(TestUtils.class.getResource("TestUtils.txt")).toURI());
    } catch (URISyntaxException e) {
      throw new IllegalStateException(e);
    }
  }

  public static Path projectDir(String projectName) {
    var file = Path.of("../projects").resolve(projectName);
    if (!Files.exists(file)) {
      throw new IllegalStateException("Invalid project directory " + file);
    }
    return file;
  }

  static ClientInputFile sonarLintInputFile(Path path, String content) throws IOException {
    return createInputFile(path, content);
  }

  private static ClientInputFile createInputFile(Path file, String content) {
    return new TestClientInputFile(file, content);
  }

  static class TestClientInputFile implements ClientInputFile {

    private final String content;
    private final Path path;

    TestClientInputFile(Path path, String content) {
      this.content = content;
      this.path = path.toAbsolutePath();
    }

    @Override
    public String getPath() {
      return path.toString();
    }

    @Override
    public boolean isTest() {
      return false;
    }

    @Override
    public Charset getCharset() {
      return StandardCharsets.UTF_8;
    }

    @Override
    public <G> G getClientObject() {
      return null;
    }

    @Override
    public String contents() {
      return content;
    }

    @Override
    public String relativePath() {
      return path.toString();
    }

    @Override
    public URI uri() {
      return path.toUri();
    }

    @Override
    public InputStream inputStream() {
      return new ByteArrayInputStream(content.getBytes(getCharset()));
    }
  }
}
