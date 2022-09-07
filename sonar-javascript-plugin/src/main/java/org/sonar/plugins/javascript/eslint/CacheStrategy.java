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

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;
import static java.util.stream.Collectors.toList;

enum CacheStrategy {
  WRITE_ONLY, READ_AND_WRITE, NO_CACHE;

  private static Path getWorkingDirectoryAbsolutePath(SensorContext context) {
    return context.fileSystem().workDir().toPath();
  }

  private static Path getBaseDirectoryAbsolutePath(SensorContext context) {
    return context.fileSystem().baseDir().toPath();
  }

  private static Path getAbsolutePath(InputFile inputFile) {
    return Path.of(inputFile.uri());
  }

  private static Path getRelativePath(Path baseAbsolutePath, Path fileAbsolutePath) {
    return baseAbsolutePath.relativize(fileAbsolutePath);
  }

  static String createCacheKey(InputFile inputFile) {
    return "jssecurity:ucfgs:" + inputFile.key();
  }

  private static void createFilesFromCache(Path workingDirectory, String cacheKey, ReadCache cache) throws IOException {
    var counter = 0;
    var startTime = System.currentTimeMillis();

    try (var archive = new ZipInputStream(new BufferedInputStream(cache.read(cacheKey)))) {
      var zipEntry = archive.getNextEntry();
      while (zipEntry != null) {
        createFile(archive, workingDirectory, Path.of(zipEntry.getName()));
        zipEntry = archive.getNextEntry();
        counter++;
      }
    }

    var duration = System.currentTimeMillis() - startTime;
    LOG.debug("Zip archive extracted containing {} file(s) in {}ms", counter, duration);
  }

  private static void createFile(InputStream inputStream, Path directoryPath, Path relativeFilePath) throws IOException {
    var filePath = directoryPath.resolve(relativeFilePath);
    Files.createDirectories(filePath.getParent());
    Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
  }

  private static void writeFilesToCache(SensorContext context, InputFile inputFile, @Nullable String[] files) throws IOException {
    var fileAbsolutePaths = convertToPaths(files);
    var cacheKey = createCacheKey(inputFile);
    var cache = context.nextCache();
    writeZipArchiveToCache(context, fileAbsolutePaths, cacheKey, cache);
  }

  private static List<Path> convertToPaths(@Nullable String[] files) {
    return files == null ? emptyList() : Arrays.stream(files).map(Path::of).collect(toList());
  }

  private static void writeZipArchiveToCache(SensorContext context, List<Path> fileAbsolutePaths, String cacheKey, WriteCache cache) throws IOException {
    Path zipFile = null;
    try {
      zipFile = Files.createTempFile("jssecurity-ucfgs", ".zip");
      createZipArchive(zipFile, getWorkingDirectoryAbsolutePath(context), fileAbsolutePaths);
      writeFileToCache(zipFile, cacheKey, cache);
    } finally {
      if (zipFile != null) {
        Files.deleteIfExists(zipFile);
      }
    }
  }

  private static void writeFileToCache(Path zipFile, String cacheKey, WriteCache cache) throws IOException {
    try (var archive = new BufferedInputStream(Files.newInputStream(zipFile))) {
      cache.write(cacheKey, archive);
    }
  }

  private static void readAndWrite(SensorContext context, InputFile inputFile) throws IOException {
    var cacheKey = createCacheKey(inputFile);
    var cache = context.previousCache();
    createFilesFromCache(getWorkingDirectoryAbsolutePath(context), cacheKey, cache);
    context.nextCache().copyFromPrevious(cacheKey);
  }

  private static boolean isFileInCache(SensorContext context, InputFile inputFile) {
    return context.previousCache().contains(createCacheKey(inputFile));
  }

  static void createZipArchive(Path zipFile, Path directoryAbsolutePath, List<Path> fileAbsolutePaths) throws IOException {
    var startTime = System.currentTimeMillis();

    try (var zipArchive = new ZipOutputStream(new BufferedOutputStream(Files.newOutputStream(zipFile)))) {
      zipArchive.setLevel(Deflater.NO_COMPRESSION);

      for (var fileAbsolutePath : fileAbsolutePaths) {
        var entryName = getRelativePath(directoryAbsolutePath, fileAbsolutePath).toString();
        zipArchive.putNextEntry(new ZipEntry(entryName));
        Files.copy(fileAbsolutePath, zipArchive);
      }
    }

    var duration = System.currentTimeMillis() - startTime;
    LOG.debug("Zip archive created containing {} file(s) in {}ms", fileAbsolutePaths.size(), duration);
  }

  private static boolean isRuntimeApiCompatible(SensorContext context) {
    return context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4));
  }

  private static void log(CacheStrategy strategy, InputFile inputFile, @Nullable String reason) {
    if (LOG.isDebugEnabled()) {
      var logBuilder = new StringBuilder("Cache Strategy set to ");
      logBuilder.append(strategy).append(" for file ").append(inputFile);
      if (reason != null) {
        logBuilder.append(" as ").append(reason);
      }
      LOG.debug(logBuilder.toString());
    }
  }

  static CacheStrategy getStrategyFor(SensorContext context, InputFile inputFile) {
    if (!isRuntimeApiCompatible(context)) {
      log(CacheStrategy.NO_CACHE, inputFile, "the runtime API is not compatible");
      return CacheStrategy.NO_CACHE;
    }

    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    var isFileUnchanged = inputFile.status() == InputFile.Status.SAME;
    var isFileInCache = isFileInCache(context, inputFile);

    if (canSkipUnchangedFiles && isFileUnchanged && isFileInCache) {
      log(CacheStrategy.READ_AND_WRITE, inputFile, null);
      return CacheStrategy.READ_AND_WRITE;
    }

    if (!canSkipUnchangedFiles) {
      log(CacheStrategy.WRITE_ONLY, inputFile, "current analysis requires all files to be analyzed");
    } else if (!isFileUnchanged) {
      log(CacheStrategy.WRITE_ONLY, inputFile, "the current file is changed");
    } else {
      log(CacheStrategy.WRITE_ONLY, inputFile, "the current file is not cached");
    }

    return CacheStrategy.WRITE_ONLY;
  }

  private static final Logger LOG = Loggers.get(AnalysisMode.class);

  boolean isAnalysisRequired(SensorContext context, InputFile inputFile) throws IOException {
    if (this != CacheStrategy.READ_AND_WRITE) {
      return true;
    }
    readAndWrite(context, inputFile);
    return false;
  }

  void writeGeneratedFilesToCache(SensorContext context, InputFile inputFile, String[] generatedFiles) throws IOException {
    if (this == CacheStrategy.WRITE_ONLY) {
      writeFilesToCache(context, inputFile, generatedFiles);
    }
  }

}
