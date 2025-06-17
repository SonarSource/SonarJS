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

import java.util.function.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFileFilter;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.WildcardPattern;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.JsTsContext;

class PathAssessor implements Predicate<InputFile> {

  private static final Logger LOG = LoggerFactory.getLogger(PathAssessor.class);
  private final WildcardPattern[] excludedPatterns;

  PathAssessor(Configuration configuration) {
    excludedPatterns = WildcardPattern.create(JsTsContext.getJsTsExcludedPaths(configuration));
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

public class JavaScriptExclusionsFileFilter implements InputFileFilter {

  private final PathAssessor pathAssessor;

  public JavaScriptExclusionsFileFilter(Configuration configuration) {
    pathAssessor = new PathAssessor(configuration);
  }

  @Override
  public boolean accept(InputFile inputFile) {
    if (
      JavaScriptLanguage.KEY.equals(inputFile.language()) ||
      TypeScriptLanguage.KEY.equals(inputFile.language()) ||
      CssLanguage.KEY.equals(inputFile.language())
    ) {
      return !pathAssessor.test(inputFile);
    } else {
      return true;
    }
  }
}
