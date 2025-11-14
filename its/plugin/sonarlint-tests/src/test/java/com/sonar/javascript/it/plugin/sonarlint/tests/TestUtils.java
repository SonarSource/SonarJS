/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import java.util.List;
import java.util.regex.Pattern;

public class TestUtils {

  static final Path JAVASCRIPT_PLUGIN_LOCATION = artifact();

  static final List<String> platformStrings = List.of(
    "darwin-arm64",
    "darwin-x64",
    "linux-arm64",
    "linux-x64",
    "linux-x64-musl",
    "win-x64",
    "multi"
  );

  /**
   * This is used to test artifact with and without embedded runtime during plugin QA integration tests
   *
   */
  private static Path artifact() {
    try {
      var target = Path.of("../../../sonar-plugin/sonar-javascript-plugin/target").toRealPath();
      try (var stream = Files.walk(target, 1)) {
        return stream
          .filter(p -> pluginFilenameMatcher().matcher(p.getFileName().toString()).matches())
          .findAny()
          .orElseThrow(() -> new IllegalStateException("Cannot find plugin artifact in " + target));
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private static Pattern pluginFilenameMatcher() {
    if (System.getenv("SONARJS_ARTIFACT") != null) {
      return Pattern.compile(
        String.format("sonar-javascript-plugin-.*-%s\\.jar", System.getenv("SONARJS_ARTIFACT"))
      );
    }

    return Pattern.compile("sonar-javascript-plugin-[0-9.]*(?:-SNAPSHOT)?\\.jar");
  }

  static boolean usingEmbeddedNode() {
    return platformStrings
      .stream()
      .anyMatch(TestUtils.JAVASCRIPT_PLUGIN_LOCATION.toString()::contains);
  }
}
