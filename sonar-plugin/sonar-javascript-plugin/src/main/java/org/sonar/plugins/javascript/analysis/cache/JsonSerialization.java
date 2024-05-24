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

import com.google.gson.Gson;
import com.google.gson.JsonParseException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.sensor.SensorContext;

class JsonSerialization<P> extends CacheSerialization {

  private static final Logger LOG = LoggerFactory.getLogger(JsonSerialization.class);

  private final Class<P> jsonClass;
  private final Gson gson = new Gson();

  JsonSerialization(Class<P> jsonClass, SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
    this.jsonClass = jsonClass;
  }

  P readFromCache() throws IOException {
    try (var input = getInputStream()) {
      var value = gson.fromJson(new InputStreamReader(input, StandardCharsets.UTF_8), jsonClass);
      LOG.debug("Cache entry extracted for key '{}'", getCacheKey());
      return value;
    } catch (JsonParseException e) {
      throw new IOException("Failure when parsing cache entry JSON", e);
    }
  }

  void writeToCache(P payload) {
    writeToCache(gson.toJson(payload).getBytes(StandardCharsets.UTF_8));
    LOG.debug("Cache entry created for key '{}'", getCacheKey());
  }
}
