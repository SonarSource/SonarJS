/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.WildcardPattern;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.analysis.ContextUtils;

class PathAssessor implements Assessor {

  private static final Logger LOG = LoggerFactory.getLogger(PathAssessor.class);
  private final WildcardPattern[] excludedPatterns;

  PathAssessor(Configuration configuration) {
    excludedPatterns = WildcardPattern.create(ContextUtils.getExcludedPaths(configuration));
  }

  @Override
  public boolean test(InputFile inputFile) {
    if (WildcardPattern.match(excludedPatterns, inputFile.relativePath())) {
      LOG.debug(
        "File {} was excluded by {} or {}",
        inputFile,
        JavaScriptPlugin.JS_EXCLUSIONS_KEY,
        JavaScriptPlugin.TS_EXCLUSIONS_KEY
      );
      return true;
    }
    return false;
  }
}
