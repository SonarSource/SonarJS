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
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

public class CacheStrategies {

  static final String NO_CACHE = "NO_CACHE";
  static final String READ_AND_WRITE = "READ_AND_WRITE";
  static final String WRITE_ONLY = "WRITE_ONLY";

  private static final Logger LOG = Loggers.get(CacheStrategies.class);

  private CacheStrategies() {
  }

  private static boolean isRuntimeApiCompatible(SensorContext context) {
    var isVersionValid = context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4));
    var isProductValid = context.runtime().getProduct() != SonarProduct.SONARLINT;
    return isVersionValid && isProductValid;
  }

  private static void log(String strategy, InputFile inputFile, @Nullable String reason) {
    if (LOG.isDebugEnabled()) {
      LOG.debug(getLogMessage(strategy, inputFile, reason));
    }
  }

  static String getLogMessage(String strategy, InputFile inputFile, @Nullable String reason) {
    var logBuilder = new StringBuilder("Cache strategy set to '");
    logBuilder.append(strategy).append("' for file '").append(inputFile).append("'");
    if (reason != null) {
      logBuilder.append(" as ").append(reason);
    }
    return logBuilder.toString();
  }

  public static CacheStrategy getStrategyFor(SensorContext context, InputFile inputFile) {
    var cacheKey = CacheKey.forFile(inputFile);

    if (!isRuntimeApiCompatible(context)) {
      var strategy = new CacheStrategy(NO_CACHE, true, null);
      log(strategy.getName(), inputFile, "the runtime API is not compatible");
      return strategy;
    }

    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    var isFileUnchanged = inputFile.status() == InputFile.Status.SAME;
    var serialization = new UCFGFilesSerialization(context, cacheKey);
    if (!canSkipUnchangedFiles || !isFileUnchanged || !serialization.isKeyInCache()) {
      var strategy = new CacheStrategy(WRITE_ONLY, true, serialization);

      if (!canSkipUnchangedFiles) {
        log(strategy.getName(), inputFile, "current analysis requires all files to be analyzed");
      } else if (!isFileUnchanged) {
        log(strategy.getName(), inputFile, "the current file is changed");
      } else {
        log(strategy.getName(), inputFile, "the current file is not cached");
      }

      return strategy;
    }

    if (!writeFilesFromCache(serialization)) {
      var strategy = new CacheStrategy(WRITE_ONLY, true, serialization);
      log(strategy.getName(), inputFile, "the cache is corrupted");
      return strategy;
    }

    var strategy = new CacheStrategy(READ_AND_WRITE, false, serialization);
    log(strategy.getName(), inputFile, null);
    return strategy;
  }

  static boolean writeFilesFromCache(UCFGFilesSerialization serialization) {
    try {
      serialization.readFromCache(null);
      serialization.copyFromPrevious();
      return true;
    } catch (IOException e) {
      LOG.error("Failure when reading cache entry", e);
      return false;
    }
  }

}
