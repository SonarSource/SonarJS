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

import java.util.List;
import java.util.Objects;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer;

public class CpdData {

  private final List<EslintBridgeServer.CpdToken> cpdTokens;
  private final String pluginVersion;

  public CpdData(List<EslintBridgeServer.CpdToken> cpdTokens, @Nullable String pluginVersion) {
    this.cpdTokens = List.copyOf(cpdTokens);
    this.pluginVersion = Objects.requireNonNullElse(pluginVersion, "");
  }

  boolean isSameVersionAs(@Nullable String pluginVersion) {
    return this.pluginVersion.equals(Objects.requireNonNullElse(pluginVersion, ""));
  }

  public List<EslintBridgeServer.CpdToken> getCpdTokens() {
    return cpdTokens;
  }

  String getPluginVersion() {
    return pluginVersion;
  }

}
