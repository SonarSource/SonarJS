/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.INSTANCE)
public class NodeDeprecationWarning {

  private static final Logger LOG = LoggerFactory.getLogger(NodeDeprecationWarning.class);
  private static final String NODE_PROPERTIES_FILE = "/node-info.properties";
  static final Version MIN_SUPPORTED_NODE_VERSION;
  private static final List<String> RECOMMENDED_NODE_VERSIONS;
  public static final Version RECOMMENDED_NODE_VERSION;

  static {
    Properties props = loadProperties(NODE_PROPERTIES_FILE);
    MIN_SUPPORTED_NODE_VERSION = Version.parse(props.getProperty("node.version.min"));
    RECOMMENDED_NODE_VERSIONS = Arrays.asList(
      props.getProperty("node.recommended.versions").split(",")
    );
    RECOMMENDED_NODE_VERSION = Version.parse(
      RECOMMENDED_NODE_VERSIONS.get(RECOMMENDED_NODE_VERSIONS.size() - 1)
    );
  }

  static Properties loadProperties(String resourceName) {
    Properties props = new Properties();
    try (InputStream inputStream = NodeDeprecationWarning.class.getResourceAsStream(resourceName)) {
      props.load(inputStream);
      return props;
    } catch (IOException ex) {
      throw new ExceptionInInitializerError("Failed to load " + NODE_PROPERTIES_FILE + ": " + ex);
    }
  }

  private final AnalysisWarningsWrapper analysisWarnings;

  public NodeDeprecationWarning(AnalysisWarningsWrapper analysisWarnings) {
    this.analysisWarnings = analysisWarnings;
  }

  void logNodeDeprecation(Version actualNodeVersion) {
    if (!actualNodeVersion.isGreaterThanOrEqual(RECOMMENDED_NODE_VERSION)) {
      String msg = String.format(
        "Using Node.js version %s to execute analysis is not recommended. " +
        "Please upgrade to a newer LTS version of Node.js: %s.",
        actualNodeVersion,
        RECOMMENDED_NODE_VERSION
      );
      LOG.warn(msg);
      analysisWarnings.addUnique(msg);
    }
  }
}
