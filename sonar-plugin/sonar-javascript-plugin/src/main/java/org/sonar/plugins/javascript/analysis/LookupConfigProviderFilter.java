package org.sonar.plugins.javascript.analysis;

import org.sonar.api.config.Configuration;
import org.sonar.api.utils.WildcardPattern;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.function.Predicate;

import static java.util.Arrays.stream;
import static java.util.stream.Stream.concat;

public class LookupConfigProviderFilter {
  private LookupConfigProviderFilter() {}

  static class FileFilter implements Predicate<Path> {

    private final Set<String> extensions = new HashSet<>();

    public FileFilter(Configuration config) {
      extensions.addAll(
        Arrays.asList(
          config
            .get(JavaScriptLanguage.FILE_SUFFIXES_KEY)
            .orElse(JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE)
            .split(",")
        )
      );
      extensions.addAll(
        Arrays.asList(
          config
            .get(TypeScriptLanguage.FILE_SUFFIXES_KEY)
            .orElse(TypeScriptLanguage.FILE_SUFFIXES_DEFVALUE)
            .split(",")
        )
      );
    }

    @Override
    public boolean test(Path path) {
      return extensions.stream().anyMatch(ext -> path.toString().endsWith(ext));
    }
  }

  static class PathFilter implements Predicate<Path> {

    private final WildcardPattern[] exclusions;

    public PathFilter(Configuration config) {
      if (!isExclusionOverridden(config)) {
        exclusions = WildcardPattern.create(JavaScriptPlugin.EXCLUSIONS_DEFAULT_VALUE);
      } else {
        WildcardPattern[] jsExcludedPatterns = WildcardPattern.create(
          config.getStringArray(JavaScriptPlugin.JS_EXCLUSIONS_KEY)
        );
        WildcardPattern[] tsExcludedPatterns = WildcardPattern.create(
          config.getStringArray(JavaScriptPlugin.TS_EXCLUSIONS_KEY)
        );
        exclusions =
          concat(stream(jsExcludedPatterns), stream(tsExcludedPatterns))
            .toArray(WildcardPattern[]::new);
      }
    }

    private static boolean isExclusionOverridden(Configuration config) {
      return (
        config.get(JavaScriptPlugin.JS_EXCLUSIONS_KEY).isPresent() ||
          config.get(JavaScriptPlugin.TS_EXCLUSIONS_KEY).isPresent()
      );
    }

    @Override
    public boolean test(Path path) {
      return WildcardPattern.match(exclusions, path.toString().replaceAll("[\\\\/]", "/"));
    }
  }
}
