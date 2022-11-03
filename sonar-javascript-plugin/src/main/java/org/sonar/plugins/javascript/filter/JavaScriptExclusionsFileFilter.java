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
package org.sonar.plugins.javascript.filter;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFileFilter;
import org.sonar.api.config.Configuration;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.css.CssLanguage;

public class JavaScriptExclusionsFileFilter implements InputFileFilter {
  private final List<Assessor> assessors;

  public JavaScriptExclusionsFileFilter(Configuration configuration) {
    assessors = Stream.of(
        new PathAssessor(configuration),
        new SizeAssessor(configuration),
        new MinificationAssessor(),
        new BundleAssessor())
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
    boolean isJsTsCss = JavaScriptLanguage.KEY.equals(inputFile.language()) ||
      TypeScriptLanguage.KEY.equals(inputFile.language()) ||
      CssLanguage.KEY.equals(inputFile.language());

    // filter only JS/TS/CSS files
    if (!isJsTsCss) {
      return true;
    }

    return assessors.stream().noneMatch(assessor -> assessor.test(inputFile));
  }
}
