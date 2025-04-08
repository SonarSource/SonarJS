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
package org.sonar.plugins.javascript.api;

import java.util.Collections;
import java.util.List;
import org.sonar.api.batch.fs.InputFile;

/**
 * Descriptor for a hook into ESLint.
 *
 * ESLint hooks are a mechanism for other plugins to execute custom logic during
 * the SonarJS analysis, with a parser context available.
 * They are not associated with rule keys and hence, don't raise any Sonar issues
 * and are executed independently of rule activation.
 *
 * A current use-case is the collection of data for cross-file analyzers.
 */
public interface EslintHook {
  /**
   * Key for the hook to be executed on JS side.
   */
  String eslintKey();

  default List<Object> configurations() {
    return Collections.emptyList();
  }

  default List<InputFile.Type> targets() {
    return List.of(InputFile.Type.MAIN);
  }

  default List<AnalysisMode> analysisModes() {
    return List.of(AnalysisMode.DEFAULT);
  }

  default List<String> blacklistedExtensions() {
    return Collections.emptyList();
  }

  /**
   * Whether the hook should be executed on JS side.
   */
  default boolean isEnabled() {
    return true;
  }
}
