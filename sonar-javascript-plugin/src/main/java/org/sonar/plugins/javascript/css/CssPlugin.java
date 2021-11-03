/*
 * SonarCSS
 * Copyright (C) 2018-2021 SonarSource SA
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
package org.sonar.css.plugin;

import org.sonar.api.Plugin;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.resources.Qualifiers;
import org.sonar.css.plugin.server.NodeDeprecationWarning;
import org.sonar.css.plugin.server.bundle.CssAnalyzerBundle;
import org.sonar.css.plugin.metrics.MetricSensor;
import org.sonar.css.plugin.server.CssAnalyzerBridgeServer;

public class CssPlugin implements Plugin {

  static final String FILE_SUFFIXES_KEY = "sonar.css.file.suffixes";
  public static final String FILE_SUFFIXES_DEFVALUE = ".css,.less,.scss";

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
      SonarWayProfile.class,
      CssRulesDefinition.class,
      CssAnalyzerBundle.class,
      CssAnalyzerBridgeServer.class,
      CssRuleSensor.class,
      StylelintReportSensor.class,
      MinifiedFilesFilter.class,
      NodeDeprecationWarning.class,

      PropertyDefinition.builder(FILE_SUFFIXES_KEY)
        .defaultValue(FILE_SUFFIXES_DEFVALUE)
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
