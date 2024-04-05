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

import static java.util.Map.entry;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * Currently supported versions ('supported' means that we execute the analysis):
 * 18 - nothing to warn, recommended version
 * 19 - not recommended
 * 20 - nothing to warn, recommended version
 * 21 - nothing to warn, recommended version
 */
@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.INSTANCE)
public class NodeDeprecationWarning {

  static final Map<Integer, String> REMOVAL_DATE = Map.ofEntries(
    entry(16, "Jan 31th, 2024"),
    entry(17, "Jan 31th, 2024")
  );

  private static final Logger LOG = LoggerFactory.getLogger(NodeDeprecationWarning.class);
  /**
   * This version should be kept in sync with sonar-javascript-plugin/pom.xml#nodeJsMinVersion.
   * <p>
   * The minor version is a requirement from the ESLint version that the bridge uses.
   */
  static final Version MIN_SUPPORTED_NODE_VERSION = Version.create(18, 17, 0);
  static final int MIN_RECOMMENDED_NODE_VERSION = 18;
  static final List<Integer> RECOMMENDED_NODE_VERSIONS = Arrays.asList(18, 20);
  static final List<Integer> ALL_RECOMMENDED_NODE_VERSIONS = Arrays.asList(18, 20, 21);
  private final AnalysisWarningsWrapper analysisWarnings;

  public NodeDeprecationWarning(AnalysisWarningsWrapper analysisWarnings) {
    this.analysisWarnings = analysisWarnings;
  }

  void logNodeDeprecation(int actualNodeVersion) {
    if (actualNodeVersion < MIN_RECOMMENDED_NODE_VERSION) {
      String msg = String.format(
        "Using Node.js version %d to execute analysis is deprecated and will stop being supported no earlier than %s." +
        " Please upgrade to a newer LTS version of Node.js %s",
        actualNodeVersion,
        REMOVAL_DATE.get(actualNodeVersion),
        RECOMMENDED_NODE_VERSIONS
      );
      LOG.warn(msg);
      analysisWarnings.addUnique(msg);
    }

    if (!ALL_RECOMMENDED_NODE_VERSIONS.contains(actualNodeVersion)) {
      String msg = String.format(
        "Node.js version %d is not recommended, you might experience issues. Please use " +
        "a recommended version of Node.js %s",
        actualNodeVersion,
        RECOMMENDED_NODE_VERSIONS
      );
      LOG.warn(msg, actualNodeVersion);
      analysisWarnings.addUnique(msg);
    }
  }
}
