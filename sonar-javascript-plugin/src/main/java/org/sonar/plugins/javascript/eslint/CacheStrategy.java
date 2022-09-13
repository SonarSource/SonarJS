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
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static org.sonar.plugins.javascript.eslint.CacheSerialization.json;
import static org.sonar.plugins.javascript.eslint.CacheSerialization.sequence;

enum CacheStrategy {
  WRITE_ONLY, READ_AND_WRITE, NO_CACHE;

  static final CacheSerialization.JsonSerialization<CacheSerialization.FilesManifest> JSON = json(CacheSerialization.FilesManifest.class);
  static final CacheSerialization.SequenceSerialization SEQUENCE = sequence();

  private static Path getWorkingDirectoryAbsolutePath(SensorContext context) {
    return context.fileSystem().workDir().toPath();
  }

  static String createCacheKey(String category, InputFile inputFile) {
    var implementationVersion = CacheStrategy.class.getPackage().getImplementationVersion();
    return "jssecurity:ucfgs:" + implementationVersion + ":" + category + ":" + inputFile.key();
  }

  private static boolean isFileInCache(SensorContext context, InputFile inputFile) {
    var jsonCacheKey = createCacheKey("JSON", inputFile);
    var sequenceCacheKey = createCacheKey("SEQ", inputFile);
    var cache = context.previousCache();
    return cache.contains(jsonCacheKey) && cache.contains(sequenceCacheKey);
  }

  private static boolean isRuntimeApiCompatible(SensorContext context) {
    var isVersionValid = context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4));
    var isProductValid = context.runtime().getProduct() != SonarProduct.SONARLINT;
    return isVersionValid && isProductValid;
  }

  private static void log(CacheStrategy strategy, InputFile inputFile, @Nullable String reason) {
    if (LOG.isDebugEnabled()) {
      LOG.debug(getLogMessage(strategy, inputFile, reason));
    }
  }

  private static void writeOnly(SensorContext context, InputFile inputFile, @Nullable String[] files) throws IOException {
    var workingDirectory = getWorkingDirectoryAbsolutePath(context);
    var generatedFiles = new CacheSerialization.GeneratedFiles(workingDirectory, files);

    writeOnlyLazily(context, inputFile, generatedFiles);
  }

  private static void writeOnlyLazily(SensorContext context, InputFile inputFile, CacheSerialization.GeneratedFiles generatedFiles)
    throws IOException {
    var cache = context.nextCache();

    var sequenceCacheKey = createCacheKey("SEQ", inputFile);
    var manifest = SEQUENCE.writeCache(cache, sequenceCacheKey, generatedFiles);

    var jsonCacheKey = createCacheKey("JSON", inputFile);
    JSON.writeCache(cache, jsonCacheKey, manifest);
  }

  private static boolean readAndWrite(SensorContext context, InputFile inputFile) {
    var success = false;

    try {
      var jsonCacheKey = createCacheKey("JSON", inputFile);
      var manifest = JSON.readCache(context.previousCache(), jsonCacheKey, null);
      if (manifest == null) {
        return false;
      }
      context.nextCache().copyFromPrevious(jsonCacheKey);

      var sequenceCacheKey = createCacheKey("SEQ", inputFile);
      var config = new CacheSerialization.SequenceConfig(getWorkingDirectoryAbsolutePath(context), manifest);
      SEQUENCE.readCache(context.previousCache(), sequenceCacheKey, config);
      context.nextCache().copyFromPrevious(sequenceCacheKey);

      success = true;
    } catch (IOException e) {
      LOG.error(String.format("Failure when reading cache entry for file '%s'", inputFile.key()), e);
    }
    return success;
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

  private static final Logger LOG = Loggers.get(CacheStrategy.class);

  boolean isAnalysisRequired(SensorContext context, InputFile inputFile) {
    if (this != CacheStrategy.READ_AND_WRITE) {
      return true;
    }
    boolean isCacheReadSuccessful = readAndWrite(context, inputFile);
    return !isCacheReadSuccessful;
  }

  void writeGeneratedFilesToCache(SensorContext context, InputFile inputFile, @Nullable String[] generatedFiles) throws IOException {
    if (this == CacheStrategy.WRITE_ONLY) {
      writeOnly(context, inputFile, generatedFiles);
    }
  }

}
