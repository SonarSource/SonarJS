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
package com.sonar.javascript.it.plugin.sonarlint.tests;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

public class TestUtils {

  private static final Pattern PLUGIN_FILENAME_PATTERN = Pattern.compile(
    "sonar-javascript-plugin-[0-9.]*(?:-SNAPSHOT)?\\.jar"
  );

  static final Path JAVASCRIPT_PLUGIN_LOCATION = artifact();

  /**
   * The `copy-plugin` QA execution unpacks the full on-demand resources ZIP (JS-2714 / SC-49784) here, so that
   * {@code plugin/<jar>} and {@code resources/<platform>/...} land as siblings on disk, exactly like a real
   * SonarLint distribution - {@code SonarLintEmbeddedNode} looks for the latter next to wherever it loads the
   * former from.
   */
  private static Path artifact() {
    try {
      var pluginDirectory = Path.of("target", "sonar-javascript-plugin", "plugin").toRealPath();
      try (var stream = Files.walk(pluginDirectory, 1)) {
        return stream
          .filter(p -> PLUGIN_FILENAME_PATTERN.matcher(p.getFileName().toString()).matches())
          .findAny()
          .orElseThrow(() ->
            new IllegalStateException("Cannot find plugin artifact in " + pluginDirectory)
          );
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
