/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import com.google.gson.Gson;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.SequenceInputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.apache.commons.compress.utils.CountingInputStream;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;
import static java.util.Collections.enumeration;
import static java.util.Objects.requireNonNull;
import static java.util.stream.Collectors.joining;
import static java.util.stream.Collectors.toList;

class CacheSerialization {

  private static final Logger LOG = Loggers.get(CacheSerialization.class);
  private static final String ENTRY_SEPARATOR = "/";
  private static final int DEFAULT_BUFFER_SIZE = 8192;

  private CacheSerialization() {
  }

  private static String convertToEntryName(Path baseAbsolutePath, Path fileAbsolutePath) {
    var relativePath = baseAbsolutePath.relativize(fileAbsolutePath);
    return StreamSupport.stream(relativePath.spliterator(), false)
      .map(Path::getFileName)
      .map(Path::toString)
      .collect(joining(ENTRY_SEPARATOR));
  }

  private static Path convertFromEntryName(Path baseAbsolutePath, String entryName) {
    var fileAbsolutePath = baseAbsolutePath;
    for (var name : entryName.split(ENTRY_SEPARATOR)) {
      fileAbsolutePath = fileAbsolutePath.resolve(Path.of(name)); // This validates that the name is a valid OS path.
    }
    return fileAbsolutePath;
  }

  private static void writeFile(InputStream input, Path file, long limit, boolean shouldFinish) throws IOException {
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
        throw new IOException(String.format("The cache stream is too small (<%d) for file %s", limit, file));
      } else if (shouldFinish && input.read() >= 0) {
        throw new IOException(String.format("The cache stream is too big (>%d) for file %s", limit, file));
      }
    }
  }

  static SequenceSerialization sequence() {
    return new SequenceSerialization();
  }

  static <T> JsonSerialization<T> json(Class<T> jsonClass) {
    return new JsonSerialization<>(jsonClass);
  }

  interface CacheReader<T, U> {
    @Nullable
    U readCache(ReadCache cache, String cacheKey, @Nullable T config) throws IOException;
  }

  interface CacheWriter<T, U> {
    @Nullable
    U writeCache(WriteCache cache, String cacheKey, @Nullable T payload) throws IOException;
  }

  static class GeneratedFiles {
    private final Path directory;
    private final List<Path> files;

    GeneratedFiles(Path directory, @Nullable String[] files) {
      this.directory = directory;
      this.files = files == null ? emptyList() : Arrays.stream(files).map(Path::of).collect(toList());
    }

    Path getDirectory() {
      return directory;
    }

    List<Path> getFiles() {
      return files;
    }
  }

  static class FilesManifest {
    private final List<FileSize> fileSizes;

    FilesManifest(List<FileSize> fileSizes) {
      this.fileSizes = List.copyOf(fileSizes);
    }

    List<FileSize> getFileSizes() {
      return fileSizes;
    }

    static class FileSize {
      private final String name;
      private final long size;

      FileSize(String name, long size) {
        this.name = name;
        this.size = size;
      }

      String getName() {
        return name;
      }

      long getSize() {
        return size;
      }
    }
  }

  static class SequenceConfig {
    private final Path directory;
    private final FilesManifest manifest;

    SequenceConfig(Path directory, FilesManifest manifest) {
      this.directory = directory;
      this.manifest = manifest;
    }

    Path getDirectory() {
      return directory;
    }

    FilesManifest getManifest() {
      return manifest;
    }
  }

  static class JsonSerialization<P> implements CacheWriter<P, Void>, CacheReader<Void, P> {

    private final Class<P> jsonClass;
    private final Gson gson = new Gson();

    JsonSerialization(Class<P> jsonClass) {
      this.jsonClass = jsonClass;
    }

    @Override
    public Void writeCache(WriteCache cache, String cacheKey, @Nullable P payload) {
      cache.write(cacheKey, gson.toJson(payload).getBytes(StandardCharsets.UTF_8));
      LOG.debug("Cache entry created for key '{}'", cacheKey);
      return null;
    }

    @Override
    public P readCache(ReadCache cache, String cacheKey, @Nullable Void config) throws IOException {
      try (var input = cache.read(cacheKey)) {
        return gson.fromJson(new InputStreamReader(input, StandardCharsets.UTF_8), jsonClass);
      }
    }

  }

  static class SequenceSerialization implements CacheWriter<GeneratedFiles, FilesManifest>, CacheReader<SequenceConfig, Void> {

    @Override
    public FilesManifest writeCache(WriteCache cache, String cacheKey, @Nullable GeneratedFiles payload) throws IOException {
      var files = List.copyOf(requireNonNull(payload).getFiles());
      var filters = files.stream().map(this::open).collect(toList());

      try (var sequence = new SequenceInputStream(enumeration(filters))) {
        cache.write(cacheKey, sequence);
      }

      LOG.debug("Cache entry created for key '{}' containing {} file(s)", cacheKey, files.size());

      return createManifest(payload.getDirectory(), files, filters);
    }

    private FilesManifest createManifest(Path directory, List<Path> files, List<CountingInputStream> filters) {
      var fileCount = files.size();
      var fileSizes = new ArrayList<FilesManifest.FileSize>();

      for (int i = 0; i < fileCount; i++) {
        var fileAbsolutePath = files.get(i);
        var bytesRead = filters.get(i).getBytesRead();
        var entryName = convertToEntryName(directory, fileAbsolutePath);

        fileSizes.add(new FilesManifest.FileSize(entryName, bytesRead));
      }

      return new FilesManifest(fileSizes);
    }

    private CountingInputStream open(Path file) {
      try {
        return new CountingInputStream(Files.newInputStream(file));
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }

    @Override
    public Void readCache(ReadCache cache, String cacheKey, @Nullable SequenceConfig config) throws IOException {
      try (var input = cache.read(cacheKey)) {
        var iterator = requireNonNull(config).getManifest().getFileSizes().iterator();
        var fileSize = iterator.hasNext() ? iterator.next() : null;
        var counter = 0;

        while (fileSize != null) {
          var file = convertFromEntryName(config.getDirectory(), fileSize.getName());
          var isLastFile = !iterator.hasNext();

          writeFile(input, file, fileSize.getSize(), isLastFile);

          fileSize = isLastFile ? null : iterator.next();
          counter++;
        }

        LOG.debug("Cache entry extracted for key '{}' containing {} file(s)", cacheKey, counter);
        return null;
      }
    }

  }

}
