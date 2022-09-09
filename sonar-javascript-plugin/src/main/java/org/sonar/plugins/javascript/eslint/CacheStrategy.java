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

import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
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

  static String createCacheKey(InputFile inputFile) {
    return "jssecurity:ucfgs:" + inputFile.key();
  }

  private static List<Path> convertToPaths(@Nullable String[] files) {
    return files == null ? emptyList() : Arrays.stream(files).map(Path::of).collect(toList());
  }

  private static boolean isFileInCache(SensorContext context, InputFile inputFile) {
    return context.previousCache().contains(createCacheKey(inputFile));
  }

  private static boolean isRuntimeApiCompatible(SensorContext context) {
    return context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4));
  }

  private static void log(CacheStrategy strategy, InputFile inputFile, @Nullable String reason) {
    if (LOG.isDebugEnabled()) {
      LOG.debug(getLogMessage(strategy, inputFile, reason));
    }
  }

  private static void writeFilesToCache(SensorContext context, InputFile inputFile, @Nullable String[] files) throws IOException {
    var fileAbsolutePaths = convertToPaths(files);
    var cacheKey = createCacheKey(inputFile);
    var workingDirectory = getWorkingDirectoryAbsolutePath(context);

    try (var inputStream = SERIALIZER.serializeFiles(workingDirectory, fileAbsolutePaths)) {
      context.nextCache().write(cacheKey, inputStream);
      LOG.debug("Cache entry created for key '{}' containing {} file(s)", cacheKey, fileAbsolutePaths.size());
    }
  }

  private static boolean readAndWrite(SensorContext context, InputFile inputFile) {
    var cacheKey = createCacheKey(inputFile);
    var inputStream = context.previousCache().read(cacheKey);

    try {
      var report = SERIALIZER.deserializeFiles(inputStream, getWorkingDirectoryAbsolutePath(context));

      if (report.isSuccess()) {
        LOG.debug("Cache entry extracted for key '{}' containing {} file(s)", cacheKey, report.getFileCount());
        context.nextCache().copyFromPrevious(cacheKey);
      }

      return report.isSuccess();
    } catch (IOException e) {
      return false;
    }
  }

  static String getLogMessage(CacheStrategy strategy, InputFile inputFile, @Nullable String reason) {
    var logBuilder = new StringBuilder("Cache strategy set to '");
    logBuilder.append(strategy).append("' for file '").append(inputFile).append("'");
    if (reason != null) {
      logBuilder.append(" as ").append(reason);
    }
    return logBuilder.toString();
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
  private static final ZipFileSerializer SERIALIZER = new ZipFileSerializer();

  boolean isAnalysisRequired(SensorContext context, InputFile inputFile) {
    if (this != CacheStrategy.READ_AND_WRITE) {
      return true;
    }
    boolean isCacheReadSuccessful = readAndWrite(context, inputFile);
    return !isCacheReadSuccessful;
  }

  void writeGeneratedFilesToCache(SensorContext context, InputFile inputFile, @Nullable String[] generatedFiles) throws IOException {
    if (this == CacheStrategy.WRITE_ONLY) {
      writeFilesToCache(context, inputFile, generatedFiles);
    }
  }

}
