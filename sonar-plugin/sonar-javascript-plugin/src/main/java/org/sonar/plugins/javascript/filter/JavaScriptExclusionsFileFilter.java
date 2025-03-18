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

import java.util.List;
import java.util.stream.Stream;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFileFilter;
import org.sonar.api.config.Configuration;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.ContextUtils;

public class JavaScriptExclusionsFileFilter implements InputFileFilter {

  private final List<Assessor> jsTsAssessors;
  private final List<Assessor> cssAssessors;

  public JavaScriptExclusionsFileFilter(Configuration configuration) {
    jsTsAssessors = Stream.of(
      new PathAssessor(configuration),
      new SizeAssessor(configuration),
      new MinificationAssessor(),
      new BundleAssessor()
    )
      .filter(assessor -> shouldBeEnabled(assessor, configuration))
      .toList();

    // We ignore the size limit for CSS files, because analyzing large CSS files takes a reasonable amount of time
    cssAssessors = Stream.of(
      new PathAssessor(configuration),
      new MinificationAssessor(),
      new BundleAssessor()
    )
      .filter(assessor -> shouldBeEnabled(assessor, configuration))
      .toList();
  }

  private static boolean shouldBeEnabled(Assessor assessor, Configuration configuration) {
    if (assessor instanceof BundleAssessor) {
      return ContextUtils.shouldDetectBundles(configuration);
    }
    return true;
  }

  @Override
  public boolean accept(InputFile inputFile) {
    boolean isJsTs =
      JavaScriptLanguage.KEY.equals(inputFile.language()) ||
      TypeScriptLanguage.KEY.equals(inputFile.language());
    boolean isCss = CssLanguage.KEY.equals(inputFile.language());

    if (isJsTs) {
      return jsTsAssessors.stream().noneMatch(assessor -> assessor.test(inputFile));
    } else if (isCss) {
      return cssAssessors.stream().noneMatch(assessor -> assessor.test(inputFile));
    } else {
      return true;
    }
  }
}
