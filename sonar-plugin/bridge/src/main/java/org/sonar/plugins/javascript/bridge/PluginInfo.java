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
package org.sonar.plugins.javascript.bridge;

import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PluginInfo {

  private static final Logger LOG = LoggerFactory.getLogger(PluginInfo.class);

  private static String version;

  private PluginInfo() {}

  public static synchronized String getVersion() {
    if (version == null) {
      version = PluginInfo.class.getPackage().getImplementationVersion();
      LOG.info("Plugin version: [{}]", version);
    }
    return version;
  }

  /**
   * Used by tests to set a specific version. The real version is read from the manifest file in the jar.
   *
   * @param version version to set
   */
  public static synchronized void setVersion(@Nullable String version) {
    PluginInfo.version = version;
  }
}
