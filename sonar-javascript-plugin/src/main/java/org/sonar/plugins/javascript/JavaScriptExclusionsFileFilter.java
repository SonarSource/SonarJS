/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import org.sonar.plugins.javascript.minify.MinificationAssessor;

import static java.util.Arrays.stream;
import static java.util.stream.Stream.concat;

public class JavaScriptExclusionsFileFilter implements InputFileFilter {

  private static final Logger LOG = Loggers.get(JavaScriptExclusionsFileFilter.class);

  private static final String[] EXCLUSIONS_DEFAULT_VALUE = new String[]{"**/node_modules/**", "**/bower_components/**"};
  private final WildcardPattern[] excludedPatterns;

  public JavaScriptExclusionsFileFilter(Configuration configuration) {
    if (!isExclusionOverridden(configuration)) {
      excludedPatterns = WildcardPattern.create(EXCLUSIONS_DEFAULT_VALUE);
    } else {
      WildcardPattern[] jsExcludedPatterns = WildcardPattern.create(configuration.getStringArray(JavaScriptPlugin.JS_EXCLUSIONS_KEY));
      WildcardPattern[] tsExcludedPatterns = WildcardPattern.create(configuration.getStringArray(JavaScriptPlugin.TS_EXCLUSIONS_KEY));
      excludedPatterns = concat(stream(jsExcludedPatterns), stream(tsExcludedPatterns)).toArray(WildcardPattern[]::new);
    }
  }

  private boolean isExclusionOverridden(Configuration configuration) {
    return configuration.get(JavaScriptPlugin.JS_EXCLUSIONS_KEY).isPresent()
      || configuration.get(JavaScriptPlugin.TS_EXCLUSIONS_KEY).isPresent();
  }

  @Override
  public boolean accept(InputFile inputFile) {
    String relativePath = inputFile.uri().toString();
    if (WildcardPattern.match(excludedPatterns, relativePath)) {
      LOG.debug("File {} was excluded by {} or {}", inputFile, JavaScriptPlugin.JS_EXCLUSIONS_KEY, JavaScriptPlugin.TS_EXCLUSIONS_KEY);
      return false;
    }

    boolean isMinified = new MinificationAssessor().isMinified(inputFile);
    if (isMinified) {
      LOG.debug("File [" + inputFile.uri() + "] looks like a minified file and will not be analyzed");
      return false;
    }

    return true;
  }

}
