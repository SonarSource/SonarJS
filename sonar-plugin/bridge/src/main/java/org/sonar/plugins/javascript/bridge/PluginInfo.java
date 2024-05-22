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
package org.sonar.plugins.javascript.bridge;

import java.util.Optional;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PluginInfo {

  private static final Logger LOG = LoggerFactory.getLogger(PluginInfo.class);

  private static String version;
  private static String ucfgPluginVersion;

  private PluginInfo() {}

  public static synchronized String getVersion() {
    if (version == null) {
      version = PluginInfo.class.getPackage().getImplementationVersion();
      LOG.debug("Plugin version: [{}]", version);
    }
    return version;
  }

  public static Optional<String> getUcfgPluginVersion() {
    return Optional.ofNullable(ucfgPluginVersion);
  }

  public static void setUcfgPluginVersion(@Nullable String ucfgPluginVersion) {
    LOG.debug("Security Frontend version is available: [{}]", ucfgPluginVersion);
    PluginInfo.ucfgPluginVersion = ucfgPluginVersion;
  }

  /**
   * Used by tests to set a specific version. Real version is read from manifest file in the jar.
   *
   * @param version version to set
   */
  public static synchronized void setVersion(@Nullable String version) {
    PluginInfo.version = version;
  }
}
