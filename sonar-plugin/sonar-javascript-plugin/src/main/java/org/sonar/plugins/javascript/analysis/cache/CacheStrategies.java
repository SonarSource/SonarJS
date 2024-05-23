/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis.cache;

import static org.sonar.plugins.javascript.analysis.cache.CacheStrategy.noCache;
import static org.sonar.plugins.javascript.analysis.cache.CacheStrategy.readAndWrite;
import static org.sonar.plugins.javascript.analysis.cache.CacheStrategy.writeOnly;

import java.io.IOException;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.PluginInfo;

public class CacheStrategies {

  private static final Logger LOG = LoggerFactory.getLogger(CacheStrategies.class);

  private static final CacheReporter REPORTER = new CacheReporter();

  private CacheStrategies() {}

  private static boolean isRuntimeApiCompatible(SensorContext context) {
    var isVersionValid = context
      .runtime()
      .getApiVersion()
      .isGreaterThanOrEqual(Version.create(9, 4));
    var isProductValid = context.runtime().getProduct() != SonarProduct.SONARLINT;
    return isVersionValid && isProductValid;
  }

  static String getLogMessage(
    CacheStrategy cacheStrategy,
    InputFile inputFile,
    @Nullable String reason
  ) {
    var logBuilder = new StringBuilder("Cache strategy set to '");
    logBuilder.append(cacheStrategy.getName()).append("' for file '").append(inputFile).append("'");
    if (reason != null) {
      logBuilder.append(" as ").append(reason);
    }
    return logBuilder.toString();
  }

  public static CacheStrategy getStrategyFor(SensorContext context, InputFile inputFile)
    throws IOException {
    return getStrategyFor(context, inputFile, PluginInfo.getVersion());
  }

  static CacheStrategy getStrategyFor(
    SensorContext context,
    InputFile inputFile,
    @Nullable String pluginVersion
  ) throws IOException {
    if (!isRuntimeApiCompatible(context)) {
      var strategy = noCache();
      REPORTER.logAndIncrement(strategy, inputFile, MissReason.RUNTIME_API_INCOMPATIBLE);
      return strategy;
    }

    var cacheKey = CacheKey.forFile(inputFile, pluginVersion);
    var serialization = new CacheAnalysisSerialization(context, cacheKey);

    if (!context.canSkipUnchangedFiles()) {
      var strategy = writeOnly(serialization);
      REPORTER.logAndIncrement(strategy, inputFile, MissReason.ANALYSIS_MODE_INELIGIBLE);
      return strategy;
    }

    var fileMetadata = serialization.fileMetadata();
    if (fileMetadata.isEmpty() || !isSameFile(fileMetadata.get(), inputFile)) {
      var strategy = writeOnly(serialization);
      REPORTER.logAndIncrement(strategy, inputFile, MissReason.FILE_CHANGED);
      return strategy;
    }

    if (!serialization.isInCache()) {
      var strategy = writeOnly(serialization);
      REPORTER.logAndIncrement(strategy, inputFile, MissReason.FILE_NOT_IN_CACHE);
      return strategy;
    }

    var cacheAnalysis = readFromCache(serialization);
    if (cacheAnalysis == null) {
      var strategy = writeOnly(serialization);
      REPORTER.logAndIncrement(strategy, inputFile, MissReason.CACHE_CORRUPTED);
      return strategy;
    }

    var strategy = readAndWrite(cacheAnalysis, serialization);
    REPORTER.logAndIncrement(strategy, inputFile, null);
    return strategy;
  }

  private static boolean isSameFile(FileMetadata fileMetadata, InputFile inputFile)
    throws IOException {
    return fileMetadata.compareTo(inputFile);
  }

  static CacheAnalysis readFromCache(CacheAnalysisSerialization serialization) {
    try {
      var cacheAnalysis = serialization.readFromCache();
      serialization.copyFromPrevious();
      return cacheAnalysis;
    } catch (IOException e) {
      LOG.error("Failure when reading cache entry", e);
      return null;
    }
  }

  public static void reset() {
    REPORTER.reset();
  }

  public static void logReport() {
    REPORTER.logReport();
  }

  enum MissReason {
    RUNTIME_API_INCOMPATIBLE("the runtime API is not compatible"),
    CACHE_DISABLED("cache is disabled"),
    ANALYSIS_MODE_INELIGIBLE("current analysis requires all files to be analyzed"),
    FILE_CHANGED("the current file is changed"),
    FILE_NOT_IN_CACHE("the current file is not cached"),
    CACHE_CORRUPTED("the cache is corrupted");

    private final String description;

    MissReason(String description) {
      this.description = description;
    }

    public String getDescription() {
      return description;
    }
  }
}
