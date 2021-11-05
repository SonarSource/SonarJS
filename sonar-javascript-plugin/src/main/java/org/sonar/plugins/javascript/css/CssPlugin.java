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
package org.sonar.plugins.javascript.css;

import org.sonar.api.Plugin;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.resources.Qualifiers;
import org.sonar.plugins.javascript.css.metrics.MetricSensor;

public class CssPlugin implements Plugin {

  public static final String STYLELINT_REPORT_PATHS = "sonar.css.stylelint.reportPaths";
  public static final String STYLELINT_REPORT_PATHS_DEFAULT_VALUE = "";

  public static final String FORMER_NODE_EXECUTABLE = "sonar.css.node";

  private static final String CSS_CATEGORY = "CSS";
  private static final String LINTER_SUBCATEGORY = "Popular Rule Engines";
  private static final String GENERAL_SUBCATEGORY = "General";

  @Override
  public void define(Context context) {
    context.addExtensions(
      MetricSensor.class,
      CssLanguage.class,
      CssProfileDefinition.class,
      CssRulesDefinition.class,
      CssRuleSensor.class,
      StylelintReportSensor.class,

      PropertyDefinition.builder(CssLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(CssLanguage.FILE_SUFFIXES_DEFVALUE)
        .name("File Suffixes")
        .description("List of suffixes for files to analyze.")
        .subCategory(GENERAL_SUBCATEGORY)
        .category(CSS_CATEGORY)
        .onQualifiers(Qualifiers.PROJECT)
        .multiValues(true)
        .build()
    );

    context.addExtension(
      PropertyDefinition.builder(STYLELINT_REPORT_PATHS)
        .defaultValue(STYLELINT_REPORT_PATHS_DEFAULT_VALUE)
        .name("Stylelint Report Files")
        .description("Paths (absolute or relative) to the JSON files with stylelint issues.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(LINTER_SUBCATEGORY)
        .category(CSS_CATEGORY)
        .multiValues(true)
        .build());
  }

}
