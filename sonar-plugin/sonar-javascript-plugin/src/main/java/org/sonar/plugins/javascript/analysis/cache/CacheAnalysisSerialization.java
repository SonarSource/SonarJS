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
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class CacheAnalysisSerialization extends CacheSerialization {

  private final UCFGFilesSerialization ucfgFileSerialization;
  private final CpdSerialization cpdSerialization;
  private final JsonSerialization<FileMetadata> fileMetadataSerialization;
  private final AstProtobufSerialization astSerialization;
  private final boolean needsAstsOverUcfgs;

  CacheAnalysisSerialization(SensorContext context, CacheKey cacheKey, boolean needsAstsOverUcfgs) {
    super(context, cacheKey);
    ucfgFileSerialization = new UCFGFilesSerialization(context, cacheKey.forUcfg());
    cpdSerialization = new CpdSerialization(context, cacheKey.forCpd());
    fileMetadataSerialization = new JsonSerialization<>(
      FileMetadata.class,
      context,
      cacheKey.forFileMetadata()
    );
    astSerialization = new AstProtobufSerialization(context, cacheKey.forAst());
    this.needsAstsOverUcfgs = needsAstsOverUcfgs;
  }

  @Override
  boolean isInCache() {
    boolean result;
    if (needsAstsOverUcfgs) {
      result = astSerialization.isInCache();
    } else {
      result = ucfgFileSerialization.isInCache();
    }
    return result && cpdSerialization.isInCache();
  }

  Optional<FileMetadata> fileMetadata() throws IOException {
    if (fileMetadataSerialization.isInCache()) {
      return Optional.of(fileMetadataSerialization.readFromCache());
    } else {
      return Optional.empty();
    }
  }

  CacheAnalysis readFromCache() throws IOException {
    Node ast = null;
    if (needsAstsOverUcfgs) {
      ast = astSerialization.readFromCache();
    } else {
      ucfgFileSerialization.readFromCache();
    }
    var cpdData = cpdSerialization.readFromCache();

    return CacheAnalysis.fromCache(cpdData.getCpdTokens(), ast);
  }

  void writeToCache(CacheAnalysis analysis, InputFile file) throws IOException {
    if (needsAstsOverUcfgs && analysis.getAst() != null) {
      astSerialization.writeToCache(analysis.getAst());
    } else {
      ucfgFileSerialization.writeToCache(analysis.getUcfgPaths());
    }
    cpdSerialization.writeToCache(new CpdData(analysis.getCpdTokens()));
    fileMetadataSerialization.writeToCache(FileMetadata.from(file));
  }

  @Override
  void copyFromPrevious() {
    if (needsAstsOverUcfgs) {
      astSerialization.copyFromPrevious();
    } else {
      ucfgFileSerialization.copyFromPrevious();
    }
    cpdSerialization.copyFromPrevious();
  }
}
