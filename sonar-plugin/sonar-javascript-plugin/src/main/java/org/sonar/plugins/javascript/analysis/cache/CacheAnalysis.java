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
package org.sonar.plugins.javascript.analysis.cache;

import java.util.List;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.bridge.BridgeServer;

public class CacheAnalysis {

  private final List<String> ucfgPaths;
  private final BridgeServer.CpdToken[] cpdTokens;

  public CacheAnalysis(@Nullable List<String> ucfgPaths, BridgeServer.CpdToken[] cpdTokens) {
    this.ucfgPaths = ucfgPaths;
    this.cpdTokens = cpdTokens;
  }

  public static CacheAnalysis fromResponse(
    List<String> ucfgPaths,
    BridgeServer.CpdToken[] cpdTokens
  ) {
    return new CacheAnalysis(ucfgPaths, cpdTokens);
  }

  static CacheAnalysis fromCache(BridgeServer.CpdToken[] cpdTokens) {
    return new CacheAnalysis(null, cpdTokens);
  }

  @Nullable
  public List<String> getUcfgPaths() {
    return ucfgPaths;
  }

  public BridgeServer.CpdToken[] getCpdTokens() {
    return cpdTokens;
  }
}
