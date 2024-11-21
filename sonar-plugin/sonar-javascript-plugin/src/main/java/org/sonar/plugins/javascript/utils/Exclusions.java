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
package org.sonar.plugins.javascript.utils;

import static java.util.Arrays.stream;
import static java.util.stream.Stream.concat;

import org.sonar.api.config.Configuration;
import org.sonar.plugins.javascript.JavaScriptPlugin;

public class Exclusions {

  private Exclusions() {
    throw new IllegalStateException("Utility class");
  }

  public static String[] getExcludedPaths(Configuration configuration) {
    if (isExclusionOverridden(configuration)) {
      return concat(
        stream(configuration.getStringArray(JavaScriptPlugin.JS_EXCLUSIONS_KEY)),
        stream(configuration.getStringArray(JavaScriptPlugin.TS_EXCLUSIONS_KEY))
      )
        .filter(x -> !x.isBlank())
        .toArray(String[]::new);
    }
    return JavaScriptPlugin.EXCLUSIONS_DEFAULT_VALUE;
  }

  private static boolean isExclusionOverridden(Configuration configuration) {
    return (
      configuration.get(JavaScriptPlugin.JS_EXCLUSIONS_KEY).isPresent() ||
      configuration.get(JavaScriptPlugin.TS_EXCLUSIONS_KEY).isPresent()
    );
  }
}
