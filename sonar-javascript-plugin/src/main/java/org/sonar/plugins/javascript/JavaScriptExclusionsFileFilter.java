/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript;

import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFileFilter;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.WildcardPattern;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.css.CssLanguage;
import org.sonar.plugins.javascript.minify.MinificationAssessor;

import static java.util.Arrays.stream;
import static java.util.stream.Stream.concat;

public class JavaScriptExclusionsFileFilter implements InputFileFilter {

  private static final Logger LOG = Loggers.get(JavaScriptExclusionsFileFilter.class);

  private static final String[] EXCLUSIONS_DEFAULT_VALUE = new String[]{
    "**/node_modules/**",
    "**/bower_components/**",
    "**/dist/**",
    "**/vendor/**",
    "**/external/**",
    "**/*.d.ts"};

  private final WildcardPattern[] excludedPatterns;
  private static final long DEFAULT_MAX_FILE_SIZE_KB = 1000L; // 1MB
  /** Note that in user-facing option handling the units are kilobytes, not bytes. */
  private long maxFileSizeKb = DEFAULT_MAX_FILE_SIZE_KB;

  public JavaScriptExclusionsFileFilter(Configuration configuration) {
    if (!isExclusionOverridden(configuration)) {
      excludedPatterns = WildcardPattern.create(EXCLUSIONS_DEFAULT_VALUE);
    } else {
      WildcardPattern[] jsExcludedPatterns = WildcardPattern.create(configuration.getStringArray(JavaScriptPlugin.JS_EXCLUSIONS_KEY));
      WildcardPattern[] tsExcludedPatterns = WildcardPattern.create(configuration.getStringArray(JavaScriptPlugin.TS_EXCLUSIONS_KEY));
      excludedPatterns = concat(stream(jsExcludedPatterns), stream(tsExcludedPatterns)).toArray(WildcardPattern[]::new);
    }
    configuration.get(JavaScriptPlugin.PROPERTY_KEY_MAX_FILE_SIZE).ifPresent(str -> {
      try {
        maxFileSizeKb = Long.parseLong(str);
        if (maxFileSizeKb <= 0) {
          fallbackToDefaultMaxFileSize("Maximum file size (sonar.javascript.maxFileSize) is not strictly positive: " + maxFileSizeKb);
        }
      } catch (NumberFormatException nfe) {
        fallbackToDefaultMaxFileSize("Maximum file size (sonar.javascript.maxFileSize) is not an integer: \"" + str + "\"");
      }
    });
  }

  private boolean isExclusionOverridden(Configuration configuration) {
    return configuration.get(JavaScriptPlugin.JS_EXCLUSIONS_KEY).isPresent()
      || configuration.get(JavaScriptPlugin.TS_EXCLUSIONS_KEY).isPresent();
  }

  @Override
  public boolean accept(InputFile inputFile) {

    boolean isJsTs =
      JavaScriptLanguage.KEY.equals(inputFile.language()) ||
      TypeScriptLanguage.KEY.equals(inputFile.language());
    boolean isJsTsCss =
      isJsTs ||
      CssLanguage.KEY.equals(inputFile.language());

    // filter only JS/TS/CSS files
    if (!isJsTsCss) {
      return true;
    }

    if (isJsTs) {
      if (SizeAssessor.hasExcessiveSize(inputFile, maxFileSizeKb * 1000)) {
        LOG.debug("File {} was excluded because of excessive size", inputFile);
        return false;
      }

      if (WildcardPattern.match(excludedPatterns, inputFile.relativePath())) {
        LOG.debug("File {} was excluded by {} or {}", inputFile, JavaScriptPlugin.JS_EXCLUSIONS_KEY, JavaScriptPlugin.TS_EXCLUSIONS_KEY);
        return false;
      }
    }

    boolean isMinified = new MinificationAssessor().isMinified(inputFile);
    if (isMinified) {
      LOG.debug("File [" + inputFile.uri() + "] looks like a minified file and will not be analyzed");
      return false;
    }

    return true;
  }

  final void fallbackToDefaultMaxFileSize(String reasonErrorMessage) {
    LOG.warn(reasonErrorMessage + ", falling back to " + DEFAULT_MAX_FILE_SIZE_KB + ".");
    maxFileSizeKb = DEFAULT_MAX_FILE_SIZE_KB;
  }

}
