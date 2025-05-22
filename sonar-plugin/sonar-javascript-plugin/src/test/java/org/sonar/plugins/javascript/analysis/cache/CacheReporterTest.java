/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.analysis.cache.CacheStrategy.noCache;
import static org.sonar.plugins.javascript.analysis.cache.CacheStrategy.writeOnly;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.event.Level;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;

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

    logTester.setLevel(Level.DEBUG);
    when(inputFile.toString()).thenAnswer(invocation ->
      String.format("file-%02d.js", counter.incrementAndGet())
    );

    cacheReporter.reset();
    cacheReporter.logAndIncrement(
      noCache(),
      inputFile,
      CacheStrategies.MissReason.RUNTIME_API_INCOMPATIBLE
    );
    cacheReporter.logAndIncrement(noCache(), inputFile, CacheStrategies.MissReason.CACHE_DISABLED);
    cacheReporter.logAndIncrement(
      writeOnly(createSerialization()),
      inputFile,
      CacheStrategies.MissReason.ANALYSIS_MODE_INELIGIBLE
    );
    cacheReporter.logAndIncrement(
      writeOnly(createSerialization()),
      inputFile,
      CacheStrategies.MissReason.FILE_CHANGED
    );
    cacheReporter.logAndIncrement(
      writeOnly(createSerialization()),
      inputFile,
      CacheStrategies.MissReason.FILE_NOT_IN_CACHE
    );
    cacheReporter.logAndIncrement(
      writeOnly(createSerialization()),
      inputFile,
      CacheStrategies.MissReason.CACHE_CORRUPTED
    );
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
      "FILE_NOT_IN_CACHE [1/7], RUNTIME_API_INCOMPATIBLE [1/7]"
    );
  }

  private CacheStrategy createReadAndWrite() {
    return CacheStrategy.readAndWrite(
      CacheAnalysis.fromCache(List.of(), null),
      createSerialization()
    );
  }

  private CacheAnalysisSerialization createSerialization() {
    return new CacheAnalysisSerialization(context, CacheKey.forFile(inputFile, null));
  }
}
