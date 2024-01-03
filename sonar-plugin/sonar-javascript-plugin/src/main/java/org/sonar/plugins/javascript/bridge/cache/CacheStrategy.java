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
import java.util.Objects;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;

public class CacheStrategy {

  static final String NO_CACHE = "NO_CACHE";
  static final String READ_AND_WRITE = "READ_AND_WRITE";
  static final String WRITE_ONLY = "WRITE_ONLY";

  private final String name;
  private final CacheAnalysis cacheAnalysis;
  private final CacheAnalysisSerialization serialization;

  private CacheStrategy(
    String name,
    @Nullable CacheAnalysis cacheAnalysis,
    @Nullable CacheAnalysisSerialization serialization
  ) {
    this.name = name;
    this.cacheAnalysis = cacheAnalysis;
    this.serialization = serialization;
  }

  static CacheStrategy noCache() {
    return new CacheStrategy(NO_CACHE, null, null);
  }

  static CacheStrategy writeOnly(CacheAnalysisSerialization serialization) {
    return new CacheStrategy(WRITE_ONLY, null, serialization);
  }

  static CacheStrategy readAndWrite(
    CacheAnalysis cacheAnalysis,
    CacheAnalysisSerialization serialization
  ) {
    return new CacheStrategy(READ_AND_WRITE, cacheAnalysis, serialization);
  }

  String getName() {
    return name;
  }

  public boolean isAnalysisRequired() {
    return cacheAnalysis == null;
  }

  public void writeAnalysisToCache(CacheAnalysis analysis, InputFile file) throws IOException {
    if (serialization != null) {
      serialization.writeToCache(analysis, file);
    }
  }

  public CacheAnalysis readAnalysisFromCache() {
    return Objects.requireNonNull(cacheAnalysis);
  }
}
