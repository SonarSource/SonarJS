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

import java.io.IOException;
import java.util.List;
import javax.annotation.Nullable;

public class CacheStrategy {

  static final String NO_CACHE = "NO_CACHE";
  static final String READ_AND_WRITE = "READ_AND_WRITE";
  static final String WRITE_ONLY = "WRITE_ONLY";

  private final String name;
  private final boolean analysisRequired;
  private final UCFGFilesSerialization serialization;
  private final MissReason reason;

  private CacheStrategy(String name, boolean analysisRequired, @Nullable UCFGFilesSerialization serialization,
    @Nullable MissReason reason) {
    this.name = name;
    this.analysisRequired = analysisRequired;
    this.serialization = serialization;
    this.reason = reason;
  }

  static CacheStrategy noCache(MissReason reason) {
    return new CacheStrategy(NO_CACHE, true, null, reason);
  }

  static CacheStrategy writeOnly(MissReason reason, UCFGFilesSerialization serialization) {
    return new CacheStrategy(WRITE_ONLY, true, serialization, reason);
  }

  static CacheStrategy readAndWrite(UCFGFilesSerialization serialization) {
    return new CacheStrategy(READ_AND_WRITE, false, serialization, null);
  }

  String getName() {
    return name;
  }

  MissReason getReason() {
    return reason;
  }

  public boolean isAnalysisRequired() {
    return analysisRequired;
  }

  public void writeGeneratedFilesToCache(@Nullable List<String> generatedFiles) throws IOException {
    if (serialization != null) {
      serialization.writeToCache(generatedFiles);
    }
  }

  enum MissReason {
    RUNTIME_API_INCOMPATIBLE("the runtime API is not compatible"),
    CACHE_DISABLED("cache is disabled"),
    ANALYSIS_MODE_INELIGIBLE("current analysis requires all files to be analyzed"),
    FILE_CHANGED("the current file is changed"),
    FILE_NOT_IN_CACHE("the current file is not cached"),
    CACHE_CORRUPTED("the cache is corrupted");

    private final String description;

    MissReason(String description) {
      this.description = description;
    }

    public String getDescription() {
      return description;
    }
  }
}
