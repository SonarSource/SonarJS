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
import org.sonar.plugins.javascript.eslint.AnalysisMode;

import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.noCache;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.readAndWrite;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.writeOnly;

public class CacheStrategies {

  private static final Logger LOG = Loggers.get(CacheStrategies.class);

  private CacheStrategies() {
  }

  private static boolean isRuntimeApiCompatible(SensorContext context) {
    var isVersionValid = context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4));
    var isProductValid = context.runtime().getProduct() != SonarProduct.SONARLINT;
    return isVersionValid && isProductValid;
  }

  private static CacheStrategy logAndGetStategy(CacheStrategy strategy, InputFile inputFile, @Nullable String reason) {
    if (LOG.isDebugEnabled()) {
      LOG.debug(getLogMessage(strategy, inputFile, reason));
    }
    return strategy;
  }

  static String getLogMessage(CacheStrategy cacheStrategy, InputFile inputFile, @Nullable String reason) {
    var logBuilder = new StringBuilder("Cache strategy set to '");
    logBuilder.append(cacheStrategy.getName()).append("' for file '").append(inputFile).append("'");
    if (reason != null) {
      logBuilder.append(" as ").append(reason);
    }
    return logBuilder.toString();
  }

  public static CacheStrategy getStrategyFor(SensorContext context, InputFile inputFile) {
    if (!isRuntimeApiCompatible(context)) {
      return logAndGetStategy(noCache(), inputFile, "the runtime API is not compatible");
    }

    var cacheKey = CacheKey.forFile(inputFile);
    var serialization = new UCFGFilesSerialization(context, cacheKey);

    if (!AnalysisMode.isRuntimeApiCompatible(context) || !context.canSkipUnchangedFiles()) {
      return logAndGetStategy(writeOnly(serialization), inputFile, "current analysis requires all files to be analyzed");
    }

    if (inputFile.status() != InputFile.Status.SAME) {
      return logAndGetStategy(writeOnly(serialization), inputFile, "the current file is changed");
    }

    if (!serialization.isKeyInCache()) {
      return logAndGetStategy(writeOnly(serialization), inputFile, "the current file is not cached");
    }

    if (!writeFilesFromCache(serialization)) {
      return logAndGetStategy(writeOnly(serialization), inputFile, "the cache is corrupted");
    }

    return logAndGetStategy(readAndWrite(serialization), inputFile, null);
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
