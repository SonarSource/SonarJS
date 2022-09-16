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

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.lang.String.format;
import static java.util.Optional.ofNullable;
import static java.util.stream.Collectors.joining;

public class CacheReporter {

  private static final Logger LOG = Loggers.get(CacheReporter.class);

  private final Map<Optional<CacheStrategy.MissReason>, AtomicInteger> metrics = new ConcurrentHashMap<>();

  static String getStrategyMessage(CacheStrategy strategy, @Nullable InputFile inputFile) {
    var logBuilder = new StringBuilder("Cache strategy set to '");
    logBuilder.append(strategy.getName()).append("'");
    if (inputFile != null) {
      logBuilder.append(" for file '").append(inputFile).append("'");
    }
    if (strategy.getReason() != null) {
      logBuilder.append(" as ").append(strategy.getReason().getDescription());
    }
    return logBuilder.toString();
  }

  private static String getMissMessage(int total, CacheStrategy.MissReason reason, int count) {
    return format("%s [%d/%d]", reason.name(), count, total);
  }

  private void logStrategy(@Nullable CacheStrategy strategy, @Nullable InputFile inputFile) {
    if (LOG.isDebugEnabled() && strategy != null) {
      LOG.debug(getStrategyMessage(strategy, inputFile));
    }
  }

  public void addStrategy(@Nullable CacheStrategy strategy, @Nullable InputFile inputFile) {
    logStrategy(strategy, inputFile);
    getCount(strategy == null ? null : strategy.getReason()).incrementAndGet();
  }

  public void reset() {
    metrics.clear();
  }

  public void logReport() {
    var total = getTotal();
    var hits = getHits();
    var misses = total - hits;

    LOG.info(format("Hit the cache for %d out of %d", hits, total));
    LOG.info(format("Miss the cache for %d out of %d: %s", misses, total, getMissMessages(total)));
  }

  private String getMissMessages(int total) {
    return metrics.entrySet().stream()
      .filter(entry -> entry.getKey().isPresent())
      .map(entry -> getMissMessage(total, entry.getKey().get(), entry.getValue().intValue()))
      .sorted()
      .collect(joining(", "));
  }

  private int getTotal() {
    var total = 0;
    for (var count : metrics.values()) {
      total += count.intValue();
    }
    return total;
  }

  private int getHits() {
    return getCount(null).intValue();
  }

  private AtomicInteger getCount(@Nullable CacheStrategy.MissReason reason) {
    return metrics.computeIfAbsent(ofNullable(reason), key -> new AtomicInteger(0));
  }

}
