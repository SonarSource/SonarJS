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
