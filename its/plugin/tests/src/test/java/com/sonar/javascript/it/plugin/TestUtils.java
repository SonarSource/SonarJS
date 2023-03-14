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
package com.sonar.javascript.it.plugin;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.sonarsource.sonarlint.core.analysis.api.ClientInputFile;

public class TestUtils {

  private static final File HOME;

  static {
    File testResources;
    try {
      testResources = new File(TestUtils.class.getResource("/TestUtils.txt").toURI());
    } catch (URISyntaxException e) {
      throw new IllegalStateException("failed to obtain HOME", e);
    }

    HOME =
      testResources // home/tests/src/test/resources
        .getParentFile() // home/tests/src/test
        .getParentFile() // home/tests/src
        .getParentFile() // home/tests
        .getParentFile(); // home
  }

  public static File homeDir() {
    return HOME;
  }

  public static File projectDir(String projectName) {
    File file = new File(homeDir(), "projects/" + projectName);
    if (!file.exists()) {
      throw new IllegalStateException("Invalid project directory " + file.getAbsolutePath());
    }
    return file;
  }

  public static File file(String relativePath) {
    return new File(homeDir(), relativePath);
  }

  public static void copyFiles(Path fromDirectory, Path toDirectory) {
    try (var files = Files.list(toDirectory)) {
      files.filter(Files::isRegularFile).forEach(file -> copyFile(file, fromDirectory));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  public static void copyFile(Path sourceFile, Path targetDirectory) {
    try {
      Files.copy(
        sourceFile,
        targetDirectory.resolve(sourceFile.getFileName()),
        StandardCopyOption.REPLACE_EXISTING
      );
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
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
      this.path = path;
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
