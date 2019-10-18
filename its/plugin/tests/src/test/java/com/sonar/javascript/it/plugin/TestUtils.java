/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2019 SonarSource SA
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

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.stream.Stream;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang.SystemUtils;
import org.sonarsource.sonarlint.core.client.api.common.analysis.ClientInputFile;

import static java.lang.String.format;

public class TestUtils {

  private static final File HOME;

  static {
    File testResources = FileUtils.toFile(TestUtils.class.getResource("/TestUtils.txt"));

    HOME = testResources // home/tests/src/tests/resources
      .getParentFile() // home/tests/src/tests
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

  static ClientInputFile prepareInputFile(File baseDir, String relativePath, String content) throws IOException {
    File file = new File(baseDir, relativePath);
    FileUtils.write(file, content, StandardCharsets.UTF_8);
    return createInputFile(file.toPath());
  }

  private static ClientInputFile createInputFile(final Path path) {
    return new ClientInputFile() {

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
      public String contents() throws IOException {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
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
      public InputStream inputStream() throws IOException {
        return Files.newInputStream(path);
      }

    };
  }

  static void npmInstall(File dir, String... params) throws IOException, InterruptedException {
    if (isUserHome(dir)) {
      throw new IllegalStateException("Attempt to install in user home " + Arrays.toString(params));
    }
    String npm = SystemUtils.IS_OS_WINDOWS ? "npm.cmd" : "npm";
    String[] cmd = Stream.concat(Stream.of(npm, "install"), Arrays.stream(params)).toArray(String[]::new);
    ProcessBuilder pb = new ProcessBuilder(cmd).inheritIO().directory(dir);
    Process process = pb.start();
    int returnValue = process.waitFor();
    if (returnValue != 0) {
      throw new IllegalStateException(format("Failed to run npm install. '%s' returned %d.'", pb.command(), returnValue));
    }
  }

  private static boolean isUserHome(File dir) throws IOException {
    String userHome = System.getProperty("user.home");
    return Files.isSameFile(dir.toPath(), Paths.get(userHome));
  }
}

