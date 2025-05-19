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
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.bridge.AstProtoUtils;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

class AstProtobufSerialization extends CacheSerialization {

  AstProtobufSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
  }

  Node readFromCache() throws IOException {
    Node node = AstProtoUtils.parseProtobuf(readBytesFromCache());
    if (node == null) {
      throw new IOException("The AST is null for key " + getCacheKey());
    }
    return node;
  }

  void writeToCache(Node node) {
    writeToCache(node.toByteArray());
  }
}
