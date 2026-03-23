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
package org.sonar.plugins.javascript.bridge;

import java.util.List;
import java.util.Set;
import org.sonar.plugins.javascript.api.AnalysisMode;

public interface AnalysisConfiguration {
  default boolean isSonarLint() {
    return false;
  }

  default boolean allowTsParserJsFiles() {
    return true;
  }

  default AnalysisMode getAnalysisMode() {
    return AnalysisMode.DEFAULT;
  }

  default boolean ignoreHeaderComments() {
    return true;
  }

  default long getMaxFileSizeProperty() {
    return 1_000L;
  }

  default List<String> getEnvironments() {
    return List.of();
  }

  default List<String> getGlobals() {
    return List.of();
  }

  default List<String> getTsExtensions() {
    return List.of();
  }

  default List<String> getJsExtensions() {
    return List.of();
  }

  default List<String> getCssExtensions() {
    return List.of();
  }

  /**
   * Controls whether JS/TS/CSS suffix arrays should be serialized in the bridge request.
   * When false, the fields are omitted so Node-side defaults are applied.
   */
  default boolean shouldSendFileSuffixes() {
    return false;
  }

  default Set<String> getTsConfigPaths() {
    return Set.of();
  }

  default List<String> getJsTsExcludedPaths() {
    return List.of();
  }

  default boolean shouldDetectBundles() {
    return true;
  }

  default boolean canAccessFileSystem() {
    return true;
  }

  default boolean shouldCreateTSProgramForOrphanFiles() {
    return true;
  }

  default boolean shouldDisableTypeChecking() {
    return false;
  }

  default boolean shouldSkipNodeModuleLookupOutsideBaseDir() {
    return false;
  }

  default String getEcmaScriptVersion() {
    return null;
  }

  default List<String> getSources() {
    return List.of();
  }

  default List<String> getInclusions() {
    return List.of();
  }

  default List<String> getExclusions() {
    return List.of();
  }

  default List<String> getTests() {
    return List.of();
  }

  default List<String> getTestInclusions() {
    return List.of();
  }

  default List<String> getTestExclusions() {
    return List.of();
  }
}
