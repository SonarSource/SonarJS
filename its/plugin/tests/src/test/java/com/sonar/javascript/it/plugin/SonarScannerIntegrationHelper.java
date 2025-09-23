/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import java.io.File;
import shadow.com.sonar.orchestrator.locator.FileLocation;
import shadow.com.sonar.orchestrator.locator.MavenLocation;

public final class SonarScannerIntegrationHelper {

  public static FileLocation getJavascriptPlugin() {
    return FileLocation.byWildcardMavenFilename(
      new File("../../../sonar-plugin/sonar-javascript-plugin/target"),
      "sonar-javascript-plugin-*-multi.jar"
    );
  }

  public static MavenLocation getYamlPlugin() {
    return MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", "LATEST_RELEASE");
  }

  public static MavenLocation getHtmlPlugin() {
    return MavenLocation.of("org.sonarsource.html", "sonar-html-plugin", "LATEST_RELEASE");
  }
}
