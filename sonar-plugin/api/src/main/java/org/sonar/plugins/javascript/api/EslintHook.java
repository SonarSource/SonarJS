/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
 * Descriptor for logic executed by ESLint during SonarJS analysis.
 *
 * <p>Implementations registered as checks through a {@link CustomRuleRepository} are associated
 * with rule keys, can raise Sonar issues, and are filtered according to the active quality profile.
 *
 * <p>Implementations registered directly through an {@link EslintHookRegistrar} are not associated
 * with rule keys, cannot raise Sonar issues, and execute independently of rule activation. Direct
 * hooks are typically used to collect data for cross-file analyzers.
 */
public interface EslintHook {
  /**
   * Key for the hook to be executed on the JS side.
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
   * Whether the hook should be executed on the JS side.
   */
  default boolean isEnabled() {
    return true;
  }
}
