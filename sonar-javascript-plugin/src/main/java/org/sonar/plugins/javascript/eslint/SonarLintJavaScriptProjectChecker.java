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

import java.util.List;
import java.util.function.Predicate;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileSystem;

import static java.util.stream.Collectors.toList;

@SonarLintSide(lifespan = "MODULE")
public class SonarLintJavaScriptProjectChecker implements JavaScriptProjectChecker {

  private static long getMaxLinesForTypeChecking(SensorContext context) {
    return context.config().getLong(MAX_LINES_PROPERTY).orElse(DEFAULT_MAX_LINES_FOR_TYPE_CHECKING);
  }

  private static long getCappedNumberOfLines(List<InputFile> files, long max) {
    var total = 0L;
    for (var file : files) {
      total += file.lines();
      if (total > max) {
        return max;
      }
    }
    return total;
  }

  private static long getNumberOfLines(List<InputFile> files) {
    return files.stream().map(InputFile::lines).mapToLong(Integer::longValue).sum();
  }

  private static final Logger LOG = Loggers.get(SonarLintJavaScriptProjectChecker.class);
  static final String MAX_LINES_PROPERTY = "sonar.javascript.sonarlint.typechecking.maxlines";
  private static final long DEFAULT_MAX_LINES_FOR_TYPE_CHECKING = 500_000L;

  private final ModuleFileSystem moduleFileSystem;

  private boolean beyondLimit = true;

  private boolean shouldCheck = true;

  public SonarLintJavaScriptProjectChecker(ModuleFileSystem moduleFileSystem) {
    this.moduleFileSystem = moduleFileSystem;
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
      var maxLinesForTypeChecking = getMaxLinesForTypeChecking(context);
      var files = getFilesMatchingPluginLanguages(context);
      var cappedNumberOfLines = getCappedNumberOfLines(files, maxLinesForTypeChecking);

      beyondLimit = cappedNumberOfLines >= maxLinesForTypeChecking;
      if (!beyondLimit) {
        LOG.debug("Project type checking for JavaScript files activated as project size (total number of lines is {}, maximum is {})",
          cappedNumberOfLines, maxLinesForTypeChecking);
      } else if (LOG.isDebugEnabled()) {
        // TypeScript type checking mechanism creates performance issues for large projects. Analyzing a file can take more than a minute in
        // SonarLint, and it can even lead to runtime errors due to Node.js being out of memory during the process.
        LOG.debug("Project type checking for JavaScript files deactivated due to project size (total number of lines is {}, maximum is {})",
          getNumberOfLines(files), maxLinesForTypeChecking);
        LOG.debug("Update \"{}\" to set a different limit.", MAX_LINES_PROPERTY);
      }
    } catch (RuntimeException e) {
      LOG.debug("Project type checking for JavaScript files deactivated because of unexpected error", e);
    }
  }

  private List<InputFile> getFilesMatchingPluginLanguages(SensorContext context) {
    Predicate<InputFile> javaScriptPredicate = JavaScriptFilePredicate.getJavaScriptPredicate(context.fileSystem())::apply;
    Predicate<InputFile> typeScriptPredicate = JavaScriptFilePredicate.getTypeScriptPredicate(context.fileSystem())::apply;
    return moduleFileSystem.files().filter(javaScriptPredicate.or(typeScriptPredicate)).collect(toList());
  }

}
