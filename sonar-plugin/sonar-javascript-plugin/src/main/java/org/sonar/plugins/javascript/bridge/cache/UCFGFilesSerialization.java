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
package org.sonar.plugins.javascript.bridge.cache;

import java.io.IOException;
import java.util.List;
import org.sonar.api.batch.sensor.SensorContext;

class UCFGFilesSerialization extends CacheSerialization {

  static final String SEQ_PREFIX = "SEQ";
  static final String JSON_PREFIX = "JSON";

  private final JsonSerialization<FilesManifest> json;
  private final SequenceSerialization sequence;

  UCFGFilesSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
    json = new JsonSerialization<>(FilesManifest.class, context, cacheKey.withPrefix(JSON_PREFIX));
    sequence = new SequenceSerialization(context, cacheKey.withPrefix(SEQ_PREFIX));
  }

  void writeToCache(List<String> files) throws IOException {
    var manifest = sequence.writeToCache(files);
    json.writeToCache(manifest);
  }

  @Override
  boolean isInCache() {
    if (!json.isInCache()) {
      return false;
    } else {
      return sequence.isInCache();
    }
  }

  void readFromCache() throws IOException {
    var manifest = json.readFromCache();
    if (manifest == null) {
      throw new IOException("The manifest is null for key " + getCacheKey());
    }

    sequence.readFromCache(manifest);
  }

  @Override
  void copyFromPrevious() {
    json.copyFromPrevious();
    sequence.copyFromPrevious();
  }
}
