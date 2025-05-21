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

import java.io.IOException;
import java.util.Optional;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.bridge.AstProtoUtils;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class AstProtobufSerialization extends CacheSerialization {

  private static final Logger LOG = LoggerFactory.getLogger(AstProtobufSerialization.class);

  AstProtobufSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
  }

  Optional<Node> readFromCache() throws IOException {
    byte[] bytes = readBytesFromCache();
    if (bytes.length == 0) {
      return Optional.empty();
    }
    Node node = AstProtoUtils.readProtobufFromBytes(bytes);
    if (node == null) {
      throw new IOException("The AST is null for key " + getCacheKey());
    }
    return Optional.of(node);
  }

  void writeToCache(@Nullable Node node) {
    byte[] bytes;
    if (node == null) {
      bytes = new byte[0];
    } else {
      bytes = node.toByteArray();
    }
    writeToCache(bytes);
    LOG.debug("Cache entry created for key '{}'", getCacheKey());
  }
}
