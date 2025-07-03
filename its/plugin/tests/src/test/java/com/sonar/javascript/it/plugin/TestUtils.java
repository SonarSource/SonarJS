/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.CopyOption;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Comparator;

public class TestUtils {

  private static final File HOME;

  static {
    HOME = Path.of("../").toFile();
  }

  public static File homeDir() {
    return HOME;
  }

  public static File projectDirNoCopy(String projectName) {
    var projectDir = homeDir().toPath().resolve("projects/" + projectName);
    if (!Files.exists(projectDir)) {
      throw new IllegalStateException("Invalid project directory " + projectDir);
    }
    return projectDir.toFile();
  }

  /**
   * Copy the project directory to a temporary directory and return it. This is to avoid race condition when multiple
   * tests are run in parallel.
   * @param projectName the name of the project
   * @return the path to the temporary directory
   *
   */
  public static File projectDir(String projectName) {
    var projectDir = projectDirNoCopy(projectName).toPath();
    try {
      Path tmpProjectDir = createTempDirForProject(projectName);
      copyFolder(projectDir, tmpProjectDir);
      return tmpProjectDir.toFile();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /**
   * Create a temporary directory for the project. It will be deleted when the JVM exits.
   * @param projectName the name of the project
   * @return the path to the temporary directory
   *
   */
  private static Path createTempDirForProject(String projectName) {
    try {
      var tempDirectory = Files.createTempDirectory(Path.of("target"), "its_" + projectName + "_");
      Runtime.getRuntime().addShutdownHook(new Thread(() -> deleteDirRecursively(tempDirectory)));
      return tempDirectory;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  static void deleteDirRecursively(Path pathToBeDeleted) {
    try (var walk = Files.walk(pathToBeDeleted)) {
      walk.sorted(Comparator.reverseOrder()).map(Path::toFile).forEach(File::delete);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  static void copyFolder(Path source, Path target, CopyOption... options) throws IOException {
    Files.walkFileTree(
      source,
      new SimpleFileVisitor<>() {
        @Override
        public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs)
          throws IOException {
          Files.createDirectories(target.resolve(source.relativize(dir).toString()));
          return FileVisitResult.CONTINUE;
        }

        @Override
        public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
          Files.copy(file, target.resolve(source.relativize(file).toString()), options);
          return FileVisitResult.CONTINUE;
        }
      }
    );
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
