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
package org.sonar.css;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import org.sonar.api.config.Configuration;
import org.sonar.api.resources.AbstractLanguage;

public class CssLanguage extends AbstractLanguage {

  public static final String KEY = "css";
  public static final String FILE_SUFFIXES_KEY = "sonar.css.file.suffixes";
  public static final String DEFAULT_FILE_SUFFIXES = ".css";

  public static final String SCSS_FILE_SUFFIXES_KEY = "sonar.css.scss.file.suffixes";
  public static final String SASS_FILE_SUFFIXES_KEY = "sonar.css.sass.file.suffixes";
  public static final String LESS_FILE_SUFFIXES_KEY = "sonar.css.less.file.suffixes";
  public static final Map<String, String> DEFAULT_DIALECT_FILE_SUFFIXES = Map.of(
    SCSS_FILE_SUFFIXES_KEY,
    ".scss",
    SASS_FILE_SUFFIXES_KEY,
    ".sass",
    LESS_FILE_SUFFIXES_KEY,
    ".less"
  );
  public static final List<String> DIALECT_FILE_SUFFIXES_KEYS = List.of(
    SCSS_FILE_SUFFIXES_KEY,
    SASS_FILE_SUFFIXES_KEY,
    LESS_FILE_SUFFIXES_KEY
  );

  private final Configuration configuration;

  public CssLanguage(Configuration configuration) {
    super(KEY, "CSS");
    this.configuration = configuration;
  }

  @Override
  public String[] getFileSuffixes() {
    return Stream.concat(
      getSuffixes(configuration, FILE_SUFFIXES_KEY, DEFAULT_FILE_SUFFIXES).stream(),
      DIALECT_FILE_SUFFIXES_KEYS.stream().flatMap(key ->
        getDialectSuffixes(configuration, key).stream()
      )
    )
      .distinct()
      .toArray(String[]::new);
  }

  public static List<String> getDialectSuffixes(Configuration configuration, String key) {
    return getSuffixes(configuration, key, DEFAULT_DIALECT_FILE_SUFFIXES.get(key));
  }

  private static List<String> getSuffixes(
    Configuration configuration,
    String key,
    String defaultValue
  ) {
    var suffixes = configuration.hasKey(key)
      ? configuration.getStringArray(key)
      : defaultValue.split(",");
    return Arrays.stream(suffixes)
      .map(String::trim)
      .filter(suffix -> !suffix.isEmpty())
      .map(suffix -> suffix.toLowerCase(Locale.ROOT))
      .map(suffix -> suffix.startsWith(".") ? suffix : "." + suffix)
      .distinct()
      .toList();
  }
}
