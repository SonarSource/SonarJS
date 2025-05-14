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

import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.MessageLite;
import java.io.IOException;
import java.io.InputStream;
import java.util.function.Function;
import org.sonar.api.batch.sensor.SensorContext;

public class ProtobufSerialization<T extends MessageLite> extends CacheSerialization {

  private final Class<T> clazz;
  private final Function<byte[], T> parser;

  ProtobufSerialization(
    Class<T> clazz,
    Function<byte[], T> parser,
    SensorContext context,
    CacheKey key
  ) {
    super(context, key);
    this.clazz = clazz;
    this.parser = parser;
  }

  T readFromCache() throws IOException {
    try (InputStream inputStream = getContext().previousCache().read(getCacheKey().toString())) {
      byte[] bytes = inputStream.readAllBytes();
      return parser.apply(bytes);
    } catch (InvalidProtocolBufferException e) {
      throw new IOException("Failed to parse protobuf for " + clazz.getSimpleName(), e);
    }
  }

  void writeToCache(T message) throws IOException {
    //        writeToFile(message.toByteArray());
    getContext().nextCache().write(getCacheKey().toString(), message.toByteArray());
    //        getContext().nextCache().copyFromPrevious(getCacheKey().toString());
  }
}
