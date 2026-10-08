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
package org.sonar.plugins.javascript.analysis;

import com.google.gson.JsonParser;
import java.util.ArrayDeque;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;

/** Translates scanner files into the logical namespace recorded by CI, without moving files. */
final class ReplayProjectPaths {

  private static final String CONFIGURATION = "configuration";
  private static final String BASE_DIR = "baseDir";

  private final String baseDir;

  private ReplayProjectPaths(String baseDir) {
    this.baseDir = baseDir;
  }

  @Nullable
  static ReplayProjectPaths read(String contextMetadata) {
    var metadata = JsonParser.parseString(contextMetadata).getAsJsonObject();
    // SQAA owns analyzer-version compatibility; empty legacy metadata has no usable context.
    if (metadata.size() == 0) {
      return null;
    }
    if (!metadata.has(CONFIGURATION) || !metadata.get(CONFIGURATION).isJsonObject()) {
      throw new IllegalArgumentException("Recorded JavaScript configuration is missing");
    }
    var configuration = metadata.getAsJsonObject(CONFIGURATION);
    if (
      !configuration.has(BASE_DIR) ||
      !configuration.get(BASE_DIR).isJsonPrimitive() ||
      !configuration.get(BASE_DIR).getAsJsonPrimitive().isString()
    ) {
      throw new IllegalArgumentException("Recorded JavaScript project base directory is missing");
    }
    var rawRoot = configuration.get(BASE_DIR).getAsString();
    var baseDir = rawRoot.replace('\\', '/');
    if (
      (!baseDir.startsWith("/") && !baseDir.matches("^[A-Za-z]:/.*")) ||
      (rawRoot.startsWith("\\") && !rawRoot.startsWith("\\\\")) ||
      baseDir.startsWith("//?/") ||
      baseDir.startsWith("//./") ||
      (baseDir.startsWith("//") && !baseDir.matches("^//[^/]++/[^/]++.*"))
    ) {
      throw new IllegalArgumentException(
        "Recorded JavaScript project base directory is not absolute"
      );
    }
    // Recorded paths are protocol data, not native filesystem paths. Node chooses the
    // replay namespace and translates recorded settings when the producer OS differs.
    return new ReplayProjectPaths(baseDir);
  }

  String baseDir() {
    return baseDir;
  }

  String filePath(InputFile inputFile) {
    var relative = inputFile.relativePath().replace('\\', '/');
    if (relative.startsWith("/") || relative.matches("^[A-Za-z]:.*")) {
      throw new IllegalArgumentException(
        "Replay file is outside the recorded project base directory"
      );
    }
    var segments = new ArrayDeque<String>();
    for (var segment : relative.split("/")) {
      if ("..".equals(segment)) {
        if (segments.isEmpty()) {
          throw new IllegalArgumentException(
            "Replay file is outside the recorded project base directory"
          );
        }
        segments.removeLast();
      } else if (!segment.isEmpty() && !".".equals(segment)) {
        segments.addLast(segment);
      }
    }
    return baseDir + (baseDir.endsWith("/") ? "" : "/") + String.join("/", segments);
  }
}
