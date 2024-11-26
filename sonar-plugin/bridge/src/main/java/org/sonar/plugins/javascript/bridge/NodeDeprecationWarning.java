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
package org.sonar.plugins.javascript.bridge;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.INSTANCE)
public class NodeDeprecationWarning {

  private static final Logger LOG = LoggerFactory.getLogger(NodeDeprecationWarning.class);

  /**
   * This version should be kept in sync with sonar-javascript-plugin/pom.xml#nodeJsMinVersion.
   * <p>
   * The minor version is a requirement from the ESLint version that the bridge uses.
   */
  static final Version MIN_SUPPORTED_NODE_VERSION = Version.create(18, 17, 0);

  private static final int MIN_RECOMMENDED_NODE_VERSION = 18;
  private static final List<String> RECOMMENDED_NODE_VERSIONS = List.of("^18.18.0", "^20.9.0", "^22.9.0");
  private final AnalysisWarningsWrapper analysisWarnings;

  public NodeDeprecationWarning(AnalysisWarningsWrapper analysisWarnings) {
    this.analysisWarnings = analysisWarnings;
  }

  void logNodeDeprecation(int actualNodeVersion) {
    if (actualNodeVersion < MIN_RECOMMENDED_NODE_VERSION) {
      String msg = String.format(
        "Using Node.js version %d to execute analysis is not supported. " +
        "Please upgrade to a newer LTS version of Node.js: %s.",
        actualNodeVersion,
        RECOMMENDED_NODE_VERSIONS
      );
      LOG.warn(msg);
      analysisWarnings.addUnique(msg);
    }
  }
}
