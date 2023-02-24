/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.noCache;
import static org.sonar.plugins.javascript.eslint.cache.CacheStrategy.writeOnly;

class CacheReporterTest {

  @RegisterExtension
  LogTesterJUnit5 logTester = new LogTesterJUnit5();

  InputFile inputFile;
  CacheReporter cacheReporter;
  SensorContext context;

  @BeforeEach
  void setUp() {
    cacheReporter = new CacheReporter();
    inputFile = mock(InputFile.class);
    context = mock(SensorContext.class);
  }

  @Test
  void should_report_cache_statistics() {
    var counter = new AtomicInteger(0);

    logTester.setLevel(LoggerLevel.DEBUG);
    when(inputFile.toString()).thenAnswer(invocation -> String.format("file-%02d.js", counter.incrementAndGet()));

    cacheReporter.reset();
    cacheReporter.logAndIncrement(noCache(), inputFile, CacheStrategies.MissReason.RUNTIME_API_INCOMPATIBLE);
    cacheReporter.logAndIncrement(noCache(), inputFile, CacheStrategies.MissReason.CACHE_DISABLED);
    cacheReporter.logAndIncrement(writeOnly(createSerialization()), inputFile, CacheStrategies.MissReason.ANALYSIS_MODE_INELIGIBLE);
    cacheReporter.logAndIncrement(writeOnly(createSerialization()), inputFile, CacheStrategies.MissReason.FILE_CHANGED);
    cacheReporter.logAndIncrement(writeOnly(createSerialization()), inputFile, CacheStrategies.MissReason.FILE_NOT_IN_CACHE);
    cacheReporter.logAndIncrement(writeOnly(createSerialization()), inputFile, CacheStrategies.MissReason.CACHE_CORRUPTED);
    cacheReporter.logAndIncrement(createReadAndWrite(), inputFile, null);
    cacheReporter.logReport();

    assertThat(logTester.logs()).containsExactly(
      "Cache strategy set to 'NO_CACHE' for file 'file-01.js' as the runtime API is not compatible",
      "Cache strategy set to 'NO_CACHE' for file 'file-02.js' as cache is disabled",
      "Cache strategy set to 'WRITE_ONLY' for file 'file-03.js' as current analysis requires all files to be analyzed",
      "Cache strategy set to 'WRITE_ONLY' for file 'file-04.js' as the current file is changed",
      "Cache strategy set to 'WRITE_ONLY' for file 'file-05.js' as the current file is not cached",
      "Cache strategy set to 'WRITE_ONLY' for file 'file-06.js' as the cache is corrupted",
      "Cache strategy set to 'READ_AND_WRITE' for file 'file-07.js'",
      "Hit the cache for 1 out of 7",
      "Miss the cache for 6 out of 7: ANALYSIS_MODE_INELIGIBLE [1/7], CACHE_CORRUPTED [1/7], CACHE_DISABLED [1/7], FILE_CHANGED [1/7], " +
        "FILE_NOT_IN_CACHE [1/7], RUNTIME_API_INCOMPATIBLE [1/7]");
  }

  private CacheStrategy createReadAndWrite() {
    return CacheStrategy.readAndWrite(CacheAnalysis.fromCache(new EslintBridgeServer.CpdToken[0]), createSerialization());
  }

  private CacheAnalysisSerialization createSerialization() {
    return new CacheAnalysisSerialization(context, CacheKey.forFile(inputFile, null));
  }

}
