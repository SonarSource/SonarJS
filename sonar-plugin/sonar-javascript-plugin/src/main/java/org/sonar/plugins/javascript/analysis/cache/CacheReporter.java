/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import static java.lang.String.format;
import static java.util.Optional.ofNullable;
import static java.util.stream.Collectors.joining;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;

class CacheReporter {

  private static final Logger LOG = LoggerFactory.getLogger(CacheReporter.class);

  private final Map<Optional<CacheStrategies.MissReason>, AtomicInteger> counters = new HashMap<>();

  private static String getStrategyMessage(
    CacheStrategy strategy,
    @Nullable InputFile inputFile,
    @Nullable CacheStrategies.MissReason missReason
  ) {
    var logBuilder = new StringBuilder("Cache strategy set to '");
    logBuilder.append(strategy.getName()).append("'");
    if (inputFile != null) {
      logBuilder.append(" for file '").append(inputFile).append("'");
    }
    if (missReason != null) {
      logBuilder.append(" as ").append(missReason.getDescription());
    }
    return logBuilder.toString();
  }

  private static String getMissMessage(int total, CacheStrategies.MissReason reason, int count) {
    return format("%s [%d/%d]", reason.name(), count, total);
  }

  void logAndIncrement(
    CacheStrategy strategy,
    InputFile inputFile,
    @Nullable CacheStrategies.MissReason missReason
  ) {
    if (LOG.isDebugEnabled()) {
      LOG.debug(getStrategyMessage(strategy, inputFile, missReason));
    }
    getCounter(missReason).incrementAndGet();
  }

  void reset() {
    counters.clear();
  }

  void logReport() {
    var total = getTotal();
    var hits = getHits();
    var misses = total - hits;

    LOG.info(format("Hit the cache for %d out of %d", hits, total));
    LOG.info(format("Miss the cache for %d out of %d%s", misses, total, getMissMessages(total)));
  }

  private String getMissMessages(int total) {
    String message = counters
      .entrySet()
      .stream()
      .filter(entry -> entry.getKey().isPresent())
      .map(entry -> getMissMessage(total, entry.getKey().get(), entry.getValue().intValue()))
      .sorted()
      .collect(joining(", "));
    return message.length() > 0 ? (": " + message) : "";
  }

  private int getTotal() {
    var total = 0;
    for (var count : counters.values()) {
      total += count.intValue();
    }
    return total;
  }

  private int getHits() {
    return getCounter(null).intValue();
  }

  private AtomicInteger getCounter(@Nullable CacheStrategies.MissReason reason) {
    return counters.computeIfAbsent(ofNullable(reason), key -> new AtomicInteger(0));
  }
}
