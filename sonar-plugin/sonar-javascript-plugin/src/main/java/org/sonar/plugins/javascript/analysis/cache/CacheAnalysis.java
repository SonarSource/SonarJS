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

import java.util.List;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.bridge.BridgeServer.CpdToken;

public class CacheAnalysis {

  private final List<String> ucfgPaths;
  private final List<CpdToken> cpdTokens;

  public CacheAnalysis(@Nullable List<String> ucfgPaths, List<CpdToken> cpdTokens) {
    this.ucfgPaths = ucfgPaths;
    this.cpdTokens = cpdTokens;
  }

  public static CacheAnalysis fromResponse(
    List<String> ucfgPaths,
    List<CpdToken> cpdTokens
  ) {
    return new CacheAnalysis(ucfgPaths, cpdTokens);
  }

  static CacheAnalysis fromCache(List<CpdToken> cpdTokens) {
    return new CacheAnalysis(null, cpdTokens);
  }

  @Nullable
  public List<String> getUcfgPaths() {
    return ucfgPaths;
  }

  public List<CpdToken> getCpdTokens() {
    return cpdTokens;
  }
}
