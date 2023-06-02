/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.eslint;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.utils.PathWalker;
import org.sonarsource.api.sonarlint.SonarLintSide;

@SonarLintSide(lifespan = "MODULE")
public class SonarLintJavaScriptProjectChecker implements JavaScriptProjectChecker {

  private static final Logger LOG = Loggers.get(SonarLintJavaScriptProjectChecker.class);
  private static final int FILE_WALK_MAX_DEPTH = 20;

  private boolean beyondLimit = true;

  private boolean shouldCheck = true;

  public boolean isBeyondLimit() {
    return beyondLimit;
  }

  public void checkOnce(SensorContext context) {
    if (shouldCheck) {
      checkLimit(context);
      shouldCheck = false;
    }
  }

  private void checkLimit(SensorContext context) {
    try {
      var start = Instant.now();
      var maxFilesForTypeChecking = ContextUtils.getMaxFilesForTypeChecking(context);
      long cappedFileCount = countFiles(context, maxFilesForTypeChecking);

      beyondLimit = cappedFileCount >= maxFilesForTypeChecking;
      if (!beyondLimit) {
        LOG.debug(
          "Project type checking for JavaScript files activated as project size is below limit (total number of files is {}, maximum is {})",
          cappedFileCount,
          maxFilesForTypeChecking
        );
      } else {
        // TypeScript type checking mechanism creates performance issues for large projects. Analyzing a file can take more than a minute in
        // SonarLint, and it can even lead to runtime errors due to Node.js being out of memory during the process.
        LOG.debug(
          "Project type checking for JavaScript files deactivated as project has too many files (maximum is {} files)",
          maxFilesForTypeChecking
        );
        // We can't inform the user of the actual number of files as the performance impact may be too high for large projects.
        LOG.debug("Update \"{}\" to set a different limit.", JavaScriptPlugin.MAX_FILES_PROPERTY);
      }

      LOG.debug(
        "Project checker duration took: {}ms",
        Duration.between(start, Instant.now()).toMillis()
      );
    } catch (RuntimeException e) {
      // Any runtime error raised by the SonarLint API would be caught here to let the analyzer proceed with the rules that don't require
      // type checking.
      LOG.debug(
        "Project type checking for JavaScript files deactivated because of unexpected error",
        e
      );
    }
  }

  private static long countFiles(SensorContext context, int maxFilesForTypeChecking) {
    var isPluginFile = Pattern.compile("\\.(js|cjs|mjs|jsx|ts|cts|mts|tsx|vue)$").asPredicate();

    try (var files = walkProjectFiles(context)) {
      return files
        .filter(Files::isRegularFile)
        .map(path -> path.getFileName().toString())
        .filter(isPluginFile)
        .limit(maxFilesForTypeChecking)
        .count();
    }
  }

  private static Stream<Path> walkProjectFiles(SensorContext context) {
    // The Files.walk() is failing on Windows with WSL (see https://bugs.openjdk.org/browse/JDK-8259617)
    return PathWalker.stream(context.fileSystem().baseDir().toPath(), FILE_WALK_MAX_DEPTH);
  }
}
