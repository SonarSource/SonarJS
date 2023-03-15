/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript.utils;

import static java.util.stream.Collectors.toList;
import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PathWalkerTest {

  @TempDir
  Path baseDir;

  @Test
  void should_walk_files() {
    var root = baseDir.resolve("walk");
    var depth = 5;
    var width = 2;

    var folders = createFolder(root, depth, width).collect(toList());
    var createdPaths = getPaths(folders.stream(), 5);
    var iteratedPaths = getPaths(PathWalker.stream(root, depth), 5);
    assertThat(createdPaths).containsExactlyElementsOf(iteratedPaths);
  }

  @Test
  void should_walk_files_until_max_depth() {
    var root = baseDir.resolve("walk");
    var depth = 5;
    var width = 2;

    var folders = createFolder(root, depth, width).collect(toList());
    var createdPaths = getPaths(folders.stream(), depth - 1);
    var iteratedPaths = getPaths(PathWalker.stream(root, depth), depth - 1);
    assertThat(createdPaths).containsExactlyElementsOf(iteratedPaths);
  }

  @NotNull
  private List<String> getPaths(Stream<Path> folder, int maxDepth) {
    return folder
      .map(path -> baseDir.relativize(path))
      .filter(path -> StreamSupport.stream(path.spliterator(), false).count() <= maxDepth)
      .map(Path::toString)
      .sorted()
      .collect(toList());
  }

  private Stream<Path> createFolder(Path path, int depth, int width) {
    try {
      Stream.Builder<Path> streamBuilder = Stream.builder();
      streamBuilder.add(path);

      Files.createDirectory(path);

      if (depth > 0) {
        IntStream
          .range(0, width)
          .mapToObj(n -> path.resolve(String.format("folder-%d", n)))
          .flatMap(folder -> createFolder(folder, depth - 1, width))
          .forEach(streamBuilder::add);

        // For Windows this requires special permissions, user running test to be added in 'gpedit.msc':
        // "Computer Configuration → Windows Settings → Security Settings → Local Policies → User Rights Assignment → Create symbolic links"
        Files.createSymbolicLink(
          path.resolve("folder"),
          path.resolve(String.format("folder-%d", width - 1))
        );

        IntStream
          .range(0, width)
          .mapToObj(n -> path.resolve(String.format("file-%d.js", n)))
          .peek(PathWalkerTest::createFile)
          .forEach(streamBuilder::add);
      }

      return streamBuilder.build();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private static void createFile(Path path) {
    try {
      Files.writeString(path, "File Content");
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
