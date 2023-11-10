package org.sonar.plugins.javascript.utils;

import static java.util.Arrays.stream;
import static java.util.stream.Stream.concat;

import org.sonar.api.config.Configuration;
import org.sonar.plugins.javascript.JavaScriptPlugin;

public class Exclusions {

  public static String[] getExcludedPaths(Configuration configuration) {
    var jsTsExclusions = concat(
      stream(configuration.getStringArray(JavaScriptPlugin.JS_EXCLUSIONS_KEY)),
      stream(configuration.getStringArray(JavaScriptPlugin.TS_EXCLUSIONS_KEY))
    )
      .toArray(String[]::new);
    return jsTsExclusions.length == 0 ? JavaScriptPlugin.EXCLUSIONS_DEFAULT_VALUE : jsTsExclusions;
  }
}
