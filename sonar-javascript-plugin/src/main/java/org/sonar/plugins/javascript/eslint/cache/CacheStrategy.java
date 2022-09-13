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
package org.sonar.plugins.javascript.eslint.cache;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

public enum CacheStrategy {
  WRITE_ONLY, READ_AND_WRITE, NO_CACHE;

  private static final LazySerialization SERIALIZATION = new LazySerialization();
  private static final Logger LOG = Loggers.get(CacheStrategy.class);

  private static Path getWorkingDirectoryAbsolutePath(SensorContext context) {
    return context.fileSystem().workDir().toPath();
  }

  static CacheKeyFactory createCacheKeyFactory(InputFile inputFile) {
    var versionKey = CacheStrategy.class.getPackage().getImplementationVersion();
    var fileKey = inputFile.key();
    return new CacheKeyFactory(versionKey, fileKey);
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

  static String getLogMessage(CacheStrategy strategy, InputFile inputFile, @Nullable String reason) {
    var logBuilder = new StringBuilder("Cache strategy set to '");
    logBuilder.append(strategy).append("' for file '").append(inputFile).append("'");
    if (reason != null) {
      logBuilder.append(" as ").append(reason);
    }
    return logBuilder.toString();
  }

  private static void writeOnly(SensorContext context, InputFile inputFile, @Nullable List<String> files) throws IOException {
    var workingDirectory = getWorkingDirectoryAbsolutePath(context);
    var cacheKeyFactory = createCacheKeyFactory(inputFile);
    var generatedFiles = new GeneratedFiles(workingDirectory, files);

    SERIALIZATION.writeCache(context.nextCache(), cacheKeyFactory, generatedFiles);
  }

  private static void readAndWrite(SensorContext context, InputFile inputFile) throws IOException {
    var workingDirectory = getWorkingDirectoryAbsolutePath(context);
    var cacheKeyFactory = createCacheKeyFactory(inputFile);

    SERIALIZATION.readCache(context.previousCache(), cacheKeyFactory, workingDirectory);
    SERIALIZATION.copyFromPrevious(context.nextCache(), cacheKeyFactory);
  }

  public static CacheStrategy getStrategyFor(SensorContext context, InputFile inputFile) {
    if (!isRuntimeApiCompatible(context)) {
      log(CacheStrategy.NO_CACHE, inputFile, "the runtime API is not compatible");
      return CacheStrategy.NO_CACHE;
    }

    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    var isFileUnchanged = inputFile.status() == InputFile.Status.SAME;
    var isFileInCache = SERIALIZATION.isFileInCache(context.previousCache(), createCacheKeyFactory(inputFile));

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

  public boolean isAnalysisRequired(SensorContext context, InputFile inputFile) {
    if (this != CacheStrategy.READ_AND_WRITE) {
      return true;
    }

    try {
      readAndWrite(context, inputFile);
      return false;
    } catch (IOException e) {
      LOG.error(String.format("Failure when reading cache entry for file '%s'", inputFile.key()), e);
      return true;
    }
  }

  public void writeGeneratedFilesToCache(SensorContext context, InputFile inputFile, @Nullable List<String> generatedFiles) throws IOException {
    if (this == CacheStrategy.WRITE_ONLY) {
      writeOnly(context, inputFile, generatedFiles);
    }
  }

}
