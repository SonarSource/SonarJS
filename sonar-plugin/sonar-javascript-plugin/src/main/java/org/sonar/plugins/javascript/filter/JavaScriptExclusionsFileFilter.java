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
package org.sonar.plugins.javascript.filter;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFileFilter;
import org.sonar.api.config.Configuration;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

public class JavaScriptExclusionsFileFilter implements InputFileFilter {

  private final List<Assessor> jsTsAssessors;
  private final List<Assessor> cssAssessors;

  public JavaScriptExclusionsFileFilter(Configuration configuration) {
    jsTsAssessors =
      Stream
        .of(
          new PathAssessor(configuration),
          new SizeAssessor(configuration),
          new MinificationAssessor(),
          new BundleAssessor()
        )
        .filter(assessor -> shouldBeEnabled(assessor, configuration))
        .collect(Collectors.toUnmodifiableList());

    // We ignore the size limit for CSS files, because analyzing large CSS files takes a reasonable amount of time
    cssAssessors =
      Stream
        .of(new PathAssessor(configuration), new MinificationAssessor(), new BundleAssessor())
        .filter(assessor -> shouldBeEnabled(assessor, configuration))
        .collect(Collectors.toUnmodifiableList());
  }

  private static boolean shouldBeEnabled(Assessor assessor, Configuration configuration) {
    if (assessor instanceof BundleAssessor) {
      return configuration.getBoolean(BundleAssessor.PROPERTY).orElse(true);
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
