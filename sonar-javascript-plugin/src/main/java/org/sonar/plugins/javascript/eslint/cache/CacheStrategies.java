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
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.eslint.AnalysisMode;

import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.MissReason.ANALYSIS_MODE_INELIGIBLE;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.MissReason.CACHE_DISABLED;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.MissReason.FILE_CHANGED;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.MissReason.RUNTIME_API_INCOMPATIBLE;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.MissReason.CACHE_CORRUPTED;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.MissReason.FILE_NOT_IN_CACHE;
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

  public static CacheStrategy getStrategyFor(SensorContext context, InputFile inputFile) {
    if (!isRuntimeApiCompatible(context)) {
      return noCache(RUNTIME_API_INCOMPATIBLE);
    }

    if (!context.isCacheEnabled()) {
      return noCache(CACHE_DISABLED);
    }

    var cacheKey = CacheKey.forFile(inputFile);
    var serialization = new UCFGFilesSerialization(context, cacheKey);

    if (!AnalysisMode.isRuntimeApiCompatible(context) || !context.canSkipUnchangedFiles()) {
      return writeOnly(ANALYSIS_MODE_INELIGIBLE, serialization);
    }

    if (inputFile.status() != InputFile.Status.SAME) {
      return writeOnly(FILE_CHANGED, serialization);
    }

    if (!serialization.isInCache()) {
      return writeOnly(FILE_NOT_IN_CACHE, serialization);
    }

    if (!writeFilesFromCache(serialization)) {
      return writeOnly(CACHE_CORRUPTED, serialization);
    }

    return readAndWrite(serialization);
  }

  static boolean writeFilesFromCache(UCFGFilesSerialization serialization) {
    try {
      serialization.readFromCache();
      serialization.copyFromPrevious();
      return true;
    } catch (IOException e) {
      LOG.error("Failure when reading cache entry", e);
      return false;
    }
  }

}
