/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;

public class CacheAnalysisSerialization extends CacheSerialization {

  private final AstProtobufSerialization astProtobufSerialization;
  private final CpdSerialization cpdSerialization;
  private final JsonSerialization<FileMetadata> fileMetadataSerialization;

  CacheAnalysisSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
    astProtobufSerialization = new AstProtobufSerialization(context, cacheKey.forAst());
    cpdSerialization = new CpdSerialization(context, cacheKey.forCpd());
    fileMetadataSerialization = new JsonSerialization<>(
      FileMetadata.class,
      context,
      cacheKey.forFileMetadata()
    );
  }

  @Override
  boolean isInCache() {
    return cpdSerialization.isInCache() && astProtobufSerialization.isInCache();
  }

  Optional<FileMetadata> fileMetadata() throws IOException {
    if (fileMetadataSerialization.isInCache()) {
      return Optional.of(fileMetadataSerialization.readFromCache());
    } else {
      return Optional.empty();
    }
  }

  CacheAnalysis readFromCache() throws IOException {
    var astData = astProtobufSerialization.readFromCache();
    var cpdData = cpdSerialization.readFromCache();
    return CacheAnalysis.fromCache(cpdData.getCpdTokens(), astData.orElse(null));
  }

  void writeToCache(CacheAnalysis analysis, InputFile file) throws IOException {
    astProtobufSerialization.writeToCache(analysis.getAst());
    cpdSerialization.writeToCache(new CpdData(analysis.getCpdTokens()));
    fileMetadataSerialization.writeToCache(FileMetadata.from(file));
  }

  @Override
  void copyFromPrevious() {
    astProtobufSerialization.copyFromPrevious();
    cpdSerialization.copyFromPrevious();
  }
}
