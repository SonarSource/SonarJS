/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Stream;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileSystem;

@SonarLintSide(lifespan = "MODULE")
public class SonarLintProjectChecker implements ProjectChecker {

  private static final Logger LOG = Loggers.get(SonarLintProjectChecker.class);
  static final String MAX_MEGA_BYTES_PROPERTY = "sonar.javascript.sonarlint.typechecking.maxmegabytes";
  private static final int DEFAULT_MAX_MEGA_BYTES_FOR_TYPE_CHECKING = 20;

  private final ModuleFileSystem moduleFileSystem;

  private boolean beyondLimit = true;

  private boolean shouldCheck = true;

  private Function<InputFile, Long> fileLengthProvider = SonarLintProjectChecker::getFileLength;

  public SonarLintProjectChecker(ModuleFileSystem moduleFileSystem) {
    this.moduleFileSystem = moduleFileSystem;
  }

  public void setFileLengthProvider(Function<InputFile, Long> fileLengthProvider) {
    this.fileLengthProvider = fileLengthProvider;
  }

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
      var maxMegaBytesForTypeChecking = getMaxMegaBytesForTypeChecking(context);
      var files = getFilesMatchingPluginLanguages(context);
      var cappedMegaBytes = getCappedMegaBytes(files, maxMegaBytesForTypeChecking);

      beyondLimit = cappedMegaBytes >= maxMegaBytesForTypeChecking;
      if (!beyondLimit) {
        LOG.debug("Project type checking for JavaScript files activated as project size (total number of mega-bytes is {}, maximum is {})",
          cappedMegaBytes, maxMegaBytesForTypeChecking);
      } else {
        // TypeScript type checking mechanism creates performance issues for large projects. Analyzing a file can take more than a minute in
        // SonarLint, and it can even lead to runtime errors due to Node.js being out of memory during the process.
        LOG.debug("Project type checking for JavaScript files deactivated due to project size (maximum is {} mega-bytes)", maxMegaBytesForTypeChecking);
        // We can't inform the user of the actual limit as the performance impact may be too high for large projects.
        LOG.debug("Update \"{}\" to set a different limit (in mega-bytes).", MAX_MEGA_BYTES_PROPERTY);
      }

      LOG.debug("Project checker duration took: {}ms", Duration.between(start, Instant.now()).toMillis());
    } catch (RuntimeException e) {
      // Any runtime error raised by the SonarLint API would be caught here to let the analyzer proceed with the rules that don't require
      // type checking.
      LOG.debug("Project type checking for JavaScript files deactivated because of unexpected error", e);
    }
  }

  private static int getMaxMegaBytesForTypeChecking(SensorContext context) {
    return context.config().getInt(MAX_MEGA_BYTES_PROPERTY).orElse(DEFAULT_MAX_MEGA_BYTES_FOR_TYPE_CHECKING);
  }

  private long getCappedMegaBytes(Stream<InputFile> files, int maxMegaBytes) {
    var maxBytes = maxMegaBytes * 1024 * 1024;
    var totalBytes = 0L;
    for (var iterator = files.iterator(); iterator.hasNext();) {
      totalBytes += fileLengthProvider.apply(iterator.next());
      if (totalBytes > maxBytes) {
        return maxMegaBytes;
      }
    }
    return totalBytes / 1024 / 1024;
  }

  private static long getFileLength(InputFile file) {
    return Path.of(file.uri()).toFile().length();
  }

  private Stream<InputFile> getFilesMatchingPluginLanguages(SensorContext context) {
    Predicate<InputFile> javaScriptPredicate = JavaScriptFilePredicate.getJavaScriptPredicate(context.fileSystem())::apply;
    Predicate<InputFile> typeScriptPredicate = JavaScriptFilePredicate.getTypeScriptPredicate(context.fileSystem())::apply;
    return moduleFileSystem.files().filter(javaScriptPredicate.or(typeScriptPredicate));
  }

}
