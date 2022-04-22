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
package org.sonar.plugins.javascript.eslint;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.api.sonarlint.SonarLintSide;

import static java.util.Map.entry;

/**
 * Currently supported versions ('supported' means that we execute the analysis):
 * 10 - deprecated (support will be removed not earlier than March 1, 2022)
 * 11 - deprecated (support will be removed not earlier than March 1, 2022), not recommended
 * 12 - deprecated (support will be removed not earlier than Aug 1, 2022)
 * 13 - deprecated (support will be removed not earlier than Aug 1, 2022), not recommended
 * 14 - nothing to warn, recommended version
 * 15 - not recommended
 * 16 - nothing to warn, recommended version
 * 17 - not recommended
 * 18 - not recommended
 */
@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.MULTIPLE_ANALYSES)
public class NodeDeprecationWarning {

  static final Map<Integer, String> REMOVAL_DATE = Map.ofEntries(
    entry(12, "August 1st, 2022"),
    entry(13, "August 1st, 2022")
  );

  private static final Logger LOG = Loggers.get(NodeDeprecationWarning.class);
  // Keep in sync with sonar-javascript-plugin/pom.xml#nodeJsMinVersion
  static final Version MIN_SUPPORTED_NODE_VERSION = Version.create(12, 22, 0);
  static final int MIN_RECOMMENDED_NODE_VERSION = 14;
  static final List<Integer> RECOMMENDED_NODE_VERSIONS = Arrays.asList(14, 16);
  static final List<Integer> ALL_RECOMMENDED_NODE_VERSIONS = Arrays.asList(12, 14, 16);
  private final AnalysisWarningsWrapper analysisWarnings;

  public NodeDeprecationWarning(AnalysisWarningsWrapper analysisWarnings) {
    this.analysisWarnings = analysisWarnings;
  }

  void logNodeDeprecation(int actualNodeVersion) {
    if (actualNodeVersion < MIN_RECOMMENDED_NODE_VERSION) {
      String msg = String.format("Using Node.js version %d to execute analysis is deprecated and will stop being supported no earlier than %s." +
          " Please upgrade to a newer LTS version of Node.js %s",
        actualNodeVersion,
        REMOVAL_DATE.get(actualNodeVersion),
        RECOMMENDED_NODE_VERSIONS);
      LOG.warn(msg);
      analysisWarnings.addUnique(msg);
    }

    if (!ALL_RECOMMENDED_NODE_VERSIONS.contains(actualNodeVersion)) {
      String msg = String.format("Node.js version %d is not recommended, you might experience issues. Please use " +
        "a recommended version of Node.js %s", actualNodeVersion, RECOMMENDED_NODE_VERSIONS);
      LOG.warn(msg, actualNodeVersion);
      analysisWarnings.addUnique(msg);
    }
  }
}
