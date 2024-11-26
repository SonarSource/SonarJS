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

import java.io.IOException;
import java.io.InputStream;
import org.sonar.api.batch.sensor.SensorContext;

class CacheSerialization {

  private final SensorContext context;
  private final CacheKey cacheKey;

  CacheSerialization(SensorContext context, CacheKey cacheKey) {
    this.context = context;
    this.cacheKey = cacheKey;
  }

  boolean isInCache() {
    return context.previousCache().contains(cacheKey.toString());
  }

  void copyFromPrevious() {
    context.nextCache().copyFromPrevious(cacheKey.toString());
  }

  SensorContext getContext() {
    return context;
  }

  CacheKey getCacheKey() {
    return cacheKey;
  }

  InputStream getInputStream() {
    return context.previousCache().read(cacheKey.toString());
  }

  byte[] readBytesFromCache() throws IOException {
    try (var input = getInputStream()) {
      return input.readAllBytes();
    }
  }

  void writeToCache(byte[] bytes) {
    context.nextCache().write(cacheKey.toString(), bytes);
  }

  void writeToCache(InputStream sequence) {
    context.nextCache().write(cacheKey.toString(), sequence);
  }
}
