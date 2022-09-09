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

import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.StreamSupport;
import java.util.zip.Deflater;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;

import static java.util.stream.Collectors.joining;

class ZipFileSerializer {

  private static final Logger LOG = Loggers.get(ZipFileSerializer.class);
  private static final Profiler PROFILER = Profiler.createIfDebug(LOG);
  private static final int DEFAULT_BUFFER_SIZE = 8192;
  private static final int MAX_ENTRIES = 1_000;
  private static final int MAX_SIZE = 1_000_000; // 1MB

  private static ArchiveOutputStream createArchiveOutputStream(OutputStream output) {
    var zipArchive = new ZipArchiveOutputStream(output);
    zipArchive.setLevel(Deflater.NO_COMPRESSION);
    return zipArchive;
  }

  private static ArchiveInputStream createArchiveInputStream(InputStream input) {
    return new ZipArchiveInputStream(input);
  }

  private static Path getRelativePath(Path baseAbsolutePath, Path fileAbsolutePath) {
    return baseAbsolutePath.relativize(fileAbsolutePath);
  }

  private static String convertToEntryName(Path relativePath) {
    return StreamSupport.stream(relativePath.spliterator(), false)
      .map(Path::getFileName)
      .map(Path::toString)
      .collect(joining("/"));
  }

  private static boolean createFile(ArchiveInputStream archive, Path file) throws IOException {
    Files.createDirectories(file.getParent());
    Files.deleteIfExists(file);
    return writeFile(archive, file);
  }

  private static boolean writeFile(ArchiveInputStream zipArchive, Path file) throws IOException {
    try (var output = new BufferedOutputStream(Files.newOutputStream(file))) {
      var buffer = new byte[DEFAULT_BUFFER_SIZE];
      var read = 0;
      var count = 0L;

      while ((read = zipArchive.read(buffer, 0, DEFAULT_BUFFER_SIZE)) >= 0 && count < MAX_SIZE) {
        output.write(buffer, 0, read);
        count += read;
      }

      if (count < MAX_SIZE) {
        LOG.debug("Too big file {} found in the Zip zipArchive", file);
      }

      return count < MAX_SIZE;
    }
  }

  DeserializationReport deserializeFiles(InputStream inputStream, Path workingDirectory) throws IOException {
    PROFILER.startDebug("Extracting Zip archive from cache");

    try (var archive = createArchiveInputStream(inputStream)) {
      var entry = archive.getNextEntry();
      var counter = 0;
      var success = true;

      while (entry != null && success && counter < MAX_ENTRIES) {
        if (!archive.canReadEntryData(entry)) {
          continue;
        }

        var filePath = workingDirectory.resolve(Path.of(entry.getName())); // This validates the entry name is an valid OS path.
        success = createFile(archive, filePath);
        counter++;
        entry = archive.getNextEntry();
      }

      if (counter >= MAX_ENTRIES) {
        LOG.debug("Too many files ({}) found in the Zip archive", counter);
      }

      return new DeserializationReport(success, counter);
    } finally {
      PROFILER.stopDebug();
    }
  }

  InputStream serializeFiles(Path directoryAbsolutePath, List<Path> fileAbsolutePaths) throws IOException {
    PROFILER.startInfo("Writing Zip archive to cache");

    try (var byteArray = new ByteArrayOutputStream(); var archive = createArchiveOutputStream(byteArray)) {
      for (var fileAbsolutePath : fileAbsolutePaths) {
        var relativePath = getRelativePath(directoryAbsolutePath, fileAbsolutePath);
        var entryName = convertToEntryName(relativePath);
        var entry = archive.createArchiveEntry(fileAbsolutePath, entryName);

        archive.putArchiveEntry(entry);
        Files.copy(fileAbsolutePath, archive);
        archive.closeArchiveEntry();
      }

      archive.finish();

      return new ByteArrayInputStream(byteArray.toByteArray());
    } finally {
      PROFILER.stopDebug();
    }
  }

  static class DeserializationReport {
    private final boolean success;
    private final int fileCount;

    DeserializationReport(boolean success, int fileCount) {
      this.success = success;
      this.fileCount = fileCount;
    }

    boolean isSuccess() {
      return success;
    }

    int getFileCount() {
      return fileCount;
    }
  }
}
