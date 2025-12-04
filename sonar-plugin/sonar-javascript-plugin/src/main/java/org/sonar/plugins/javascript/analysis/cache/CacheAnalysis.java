/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import org.sonar.plugins.javascript.bridge.protobuf.Node;

public class CacheAnalysis {

  private final List<String> ucfgPaths;
  private final List<CpdToken> cpdTokens;
  private final Node ast;

  public CacheAnalysis(
    @Nullable List<String> ucfgPaths,
    List<CpdToken> cpdTokens,
    @Nullable Node ast
  ) {
    this.ucfgPaths = ucfgPaths;
    this.cpdTokens = cpdTokens;
    this.ast = ast;
  }

  public static CacheAnalysis fromResponse(
    List<String> ucfgPaths,
    List<CpdToken> cpdTokens,
    @Nullable Node ast
  ) {
    return new CacheAnalysis(ucfgPaths, cpdTokens, ast);
  }

  static CacheAnalysis fromCache(List<CpdToken> cpdTokens, @Nullable Node ast) {
    return new CacheAnalysis(null, cpdTokens, ast);
  }

  @Nullable
  public List<String> getUcfgPaths() {
    return ucfgPaths;
  }

  public List<CpdToken> getCpdTokens() {
    return cpdTokens;
  }

  @Nullable
  public Node getAst() {
    return ast;
  }
}
