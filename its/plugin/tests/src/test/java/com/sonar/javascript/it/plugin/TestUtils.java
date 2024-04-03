/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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
import java.io.UncheckedIOException;
import java.net.URISyntaxException;
import java.nio.file.CopyOption;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;

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
    var file = homeDir().toPath().resolve("projects/" + projectName);
    if (!Files.exists(file)) {
      throw new IllegalStateException("Invalid project directory " + file);
    }
    try {
      copyFolder(file, Files.createTempFile(Path.of("target"), "unittest", ".tmp"));
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
    return file.toFile();
  }

  static void copyFolder(Path source, Path target, CopyOption... options)
    throws IOException {
    Files.walkFileTree(source, new SimpleFileVisitor<>() {

      @Override
      public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs)
        throws IOException {
        Files.createDirectories(target.resolve(source.relativize(dir).toString()));
        return FileVisitResult.CONTINUE;
      }

      @Override
      public FileVisitResult visitFile(Path file, BasicFileAttributes attrs)
        throws IOException {
        Files.copy(file, target.resolve(source.relativize(file).toString()), options);
        return FileVisitResult.CONTINUE;
      }
    });
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
}
