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
  boolean isSonarLint();

  boolean allowTsParserJsFiles();

  AnalysisMode getAnalysisMode();

  boolean ignoreHeaderComments();

  long getMaxFileSizeProperty();

  List<String> getEnvironments();

  List<String> getGlobals();

  List<String> getTsExtensions();

  List<String> getJsExtensions();

  List<String> getCssExtensions();

  Set<String> getTsConfigPaths();

  List<String> getJsTsExcludedPaths();

  boolean shouldDetectBundles();

  boolean canAccessFileSystem();

  boolean shouldCreateTSProgramForOrphanFiles();

  boolean shouldDisableTypeChecking();

  List<String> getSources();

  List<String> getInclusions();

  List<String> getExclusions();

  List<String> getTests();

  List<String> getTestInclusions();

  List<String> getTestExclusions();
}
