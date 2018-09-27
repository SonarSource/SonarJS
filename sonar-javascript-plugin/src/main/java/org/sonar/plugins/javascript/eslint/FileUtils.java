/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Collections;

class FileUtils {

  private FileUtils() {
    // utility class
  }

  static void copyFromClasspath(String classpathResource, Path targetPath) throws URISyntaxException, IOException {
    URI bundleUri = FileUtils.class.getResource("/" + classpathResource).toURI();
    FileSystem fileSystem = null;
    try {
      Path source;
      switch (bundleUri.getScheme()) {
        // file scheme is used when tests are executed from IDE
        case "file":
          source = new File(bundleUri).toPath();
          break;
        case "jar":
          fileSystem = FileSystems.newFileSystem(bundleUri, Collections.emptyMap());
          source = fileSystem.getPath("node_modules").toAbsolutePath();
          break;
        default:
          throw new IllegalStateException(bundleUri.toString());
      }
      copyDirectory(source, targetPath);
    } finally {
      if (fileSystem != null) {
        fileSystem.close();
      }
    }
  }

  private static void copyDirectory(Path source, Path target) throws IOException {
    Files.walkFileTree(source, new SimpleFileVisitor<Path>() {
      @Override
      public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
        Path targetDir = resolveInTarget(dir, target, source);
        try {
          Files.copy(dir, targetDir);
        } catch (FileAlreadyExistsException e) {
          if (!targetDir.toFile().isDirectory()) {
            throw e;
          }
        }
        return FileVisitResult.CONTINUE;
      }

      @Override
      public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
        Files.copy(file, resolveInTarget(file, target, source));
        return FileVisitResult.CONTINUE;
      }

      private Path resolveInTarget(Path path, Path target, Path source) {
        return target.resolve(source.relativize(path).toString());
      }
    });
  }
}
