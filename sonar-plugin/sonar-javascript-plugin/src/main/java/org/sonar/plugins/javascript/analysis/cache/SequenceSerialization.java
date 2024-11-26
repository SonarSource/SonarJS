/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis.cache;

import static java.util.Collections.emptyList;
import static java.util.Objects.requireNonNull;
import static java.util.stream.Collectors.joining;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.sensor.SensorContext;

class SequenceSerialization extends CacheSerialization {

  private static final Logger LOG = LoggerFactory.getLogger(SequenceSerialization.class);
  private static final String ENTRY_SEPARATOR = "/";
  private static final int DEFAULT_BUFFER_SIZE = 8192;

  SequenceSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
  }

  private static String convertToEntryName(Path baseAbsolutePath, Path fileAbsolutePath) {
    var relativePath = baseAbsolutePath.relativize(fileAbsolutePath);
    return StreamSupport
      .stream(relativePath.spliterator(), false)
      .map(Path::getFileName)
      .map(Path::toString)
      .collect(joining(ENTRY_SEPARATOR));
  }

  private static Path convertFromEntryName(Path baseAbsolutePath, String entryName) {
    var fileAbsolutePath = baseAbsolutePath;
    for (var name : entryName.split(ENTRY_SEPARATOR)) {
      // This validates that the name is a valid OS path.
      fileAbsolutePath = fileAbsolutePath.resolve(Path.of(name));
    }
    return fileAbsolutePath;
  }

  private static void writeFile(InputStream input, Path file, long limit, boolean shouldFinish)
    throws IOException {
    Files.createDirectories(file.getParent());

    try (var output = new BufferedOutputStream(Files.newOutputStream(file))) {
      var buffer = new byte[DEFAULT_BUFFER_SIZE];
      var read = 0;
      var totalRead = 0L;
      var toRead = (int) Math.min(DEFAULT_BUFFER_SIZE, limit - totalRead);

      while (totalRead < limit && (read = input.read(buffer, 0, toRead)) >= 0) {
        output.write(buffer, 0, read);
        totalRead += read;
        toRead = (int) Math.min(DEFAULT_BUFFER_SIZE, limit - totalRead);
      }

      if (totalRead < limit) {
        throw new IOException(
          String.format("The cache stream is too small (<%d) for file %s", limit, file)
        );
      } else if (shouldFinish && input.read() >= 0) {
        throw new IOException(
          String.format("The cache stream is too big (>%d) for file %s", limit, file)
        );
      }
    }
  }

  private static FilesManifest createManifest(Path directory, FileIterator enumeration) {
    var fileSizes = new ArrayList<FilesManifest.FileSize>();

    for (var file : enumeration.getFiles()) {
      var bytesRead = enumeration.getFileSize(file);
      var entryName = convertToEntryName(directory, file);

      fileSizes.add(new FilesManifest.FileSize(entryName, bytesRead));
    }

    return new FilesManifest(fileSizes);
  }

  FilesManifest writeToCache(@Nullable List<String> generatedFiles) throws IOException {
    List<Path> paths = generatedFiles == null
      ? emptyList()
      : generatedFiles.stream().map(Path::of).toList();
    var iterator = new FileIterator(paths);

    try (var sequence = new SequenceInputStream(new IteratorEnumeration<>(iterator))) {
      writeToCache(sequence);
    }

    LOG.debug(
      "Cache entry created for key '{}' containing {} file(s)",
      getCacheKey(),
      iterator.getCount()
    );

    return createManifest(getWorkingDirectoryAbsolutePath(), iterator);
  }

  void readFromCache(@Nullable FilesManifest manifest) throws IOException {
    try (var input = getInputStream()) {
      var iterator = requireNonNull(manifest).getFileSizes().iterator();
      var fileSize = iterator.hasNext() ? iterator.next() : null;
      var counter = 0;

      while (fileSize != null) {
        var file = convertFromEntryName(getWorkingDirectoryAbsolutePath(), fileSize.getName());
        var isLastFile = !iterator.hasNext();

        writeFile(input, file, fileSize.getSize(), isLastFile);

        fileSize = isLastFile ? null : iterator.next();
        counter++;
      }

      LOG.debug("Cache entry extracted for key '{}' containing {} file(s)", getCacheKey(), counter);
    }
  }

  private Path getWorkingDirectoryAbsolutePath() {
    return getContext().fileSystem().workDir().toPath();
  }
}
