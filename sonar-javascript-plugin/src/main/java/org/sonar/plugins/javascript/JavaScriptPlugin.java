/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import org.sonar.api.Plugin;
import org.sonar.api.PropertyType;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.resources.Qualifiers;
import org.sonar.api.utils.Version;
import org.sonar.javascript.tree.symbols.GlobalVariableNames;
import org.sonar.javascript.tree.symbols.type.JQuery;
import org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition;

public class JavaScriptPlugin implements Plugin {

  // Subcategories

  private static final String GENERAL = "General";
  private static final String TEST_AND_COVERAGE = "Tests and Coverage";
  private static final String LIBRARIES = "Libraries";
  private static final String JAVASCRIPT_CATEGORY = "JavaScript";

  // Global JavaScript constants

  public static final String FILE_SUFFIXES_KEY = "sonar.javascript.file.suffixes";
  public static final String FILE_SUFFIXES_DEFVALUE = ".js";

  public static final String PROPERTY_PREFIX = "sonar.javascript";

  public static final String LCOV_REPORT_PATHS = PROPERTY_PREFIX + ".lcov.reportPaths";
  public static final String LCOV_REPORT_PATHS_DEFAULT_VALUE = "";

  public static final String LCOV_UT_REPORT_PATH = PROPERTY_PREFIX + ".lcov.reportPath";
  public static final String LCOV_UT_REPORT_PATH_DEFAULT_VALUE = "";

  public static final String LCOV_IT_REPORT_PATH = PROPERTY_PREFIX + ".lcov.itReportPath";
  public static final String LCOV_IT_REPORT_PATH_DEFAULT_VALUE = "";

  public static final String FORCE_ZERO_COVERAGE_KEY = "sonar.javascript.forceZeroCoverage";
  public static final String FORCE_ZERO_COVERAGE_DEFAULT_VALUE = "false";

  public static final String JQUERY_OBJECT_ALIASES = JQuery.JQUERY_OBJECT_ALIASES;
  public static final String JQUERY_OBJECT_ALIASES_DEFAULT_VALUE = JQuery.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE;

  public static final String ENVIRONMENTS = GlobalVariableNames.ENVIRONMENTS_PROPERTY_KEY;
  public static final String ENVIRONMENTS_DEFAULT_VALUE = GlobalVariableNames.ENVIRONMENTS_DEFAULT_VALUE;

  public static final String GLOBALS = GlobalVariableNames.GLOBALS_PROPERTY_KEY;
  public static final String GLOBALS_DEFAULT_VALUE = GlobalVariableNames.GLOBALS_DEFAULT_VALUE;

  public static final String IGNORE_HEADER_COMMENTS = PROPERTY_PREFIX + ".ignoreHeaderComments";
  public static final Boolean IGNORE_HEADER_COMMENTS_DEFAULT_VALUE = true;

  public static final Version V6_2 = Version.create(6, 2);

  @Override
  public void define(Context context) {
    context.addExtensions(
      JavaScriptLanguage.class,
      JavaScriptSquidSensor.class,
      new JavaScriptRulesDefinition(context.getSonarQubeVersion()),
      SonarWayRecommendedProfile.class,
      SonarWayProfile.class);

    boolean isAtLeastSq62 = context.getSonarQubeVersion().isGreaterThanOrEqual(V6_2);
    String reportPropertyDeprecationMessage = isAtLeastSq62 ? "DEPRECATED: use sonar.javascript.lcov.reportPaths. " : "";

    context.addExtensions(
      PropertyDefinition.builder(FILE_SUFFIXES_KEY)
        .defaultValue(FILE_SUFFIXES_DEFVALUE)
        .name("File Suffixes")
        .description("Comma-separated list of suffixes for files to analyze.")
        .subCategory(GENERAL)
        .category(JAVASCRIPT_CATEGORY)
        .onQualifiers(Qualifiers.PROJECT)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.IGNORE_HEADER_COMMENTS)
        .defaultValue(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE.toString())
        .name("Ignore header comments")
        .description("True to not count file header comments in comment metrics.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(JAVASCRIPT_CATEGORY)
        .type(PropertyType.BOOLEAN)
        .build(),

      PropertyDefinition.builder(LCOV_UT_REPORT_PATH)
        .defaultValue(LCOV_UT_REPORT_PATH_DEFAULT_VALUE)
        .name("Unit Tests LCOV File")
        .description(reportPropertyDeprecationMessage + "Path (absolute or relative) to the file with LCOV data for unit tests.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .subCategory(TEST_AND_COVERAGE)
        .category(JAVASCRIPT_CATEGORY)
        .build(),

      PropertyDefinition.builder(LCOV_IT_REPORT_PATH)
        .defaultValue(LCOV_IT_REPORT_PATH_DEFAULT_VALUE)
        .name("Integration Tests LCOV File")
        .description(reportPropertyDeprecationMessage + "Path (absolute or relative) to the file with LCOV data for integration tests.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .subCategory(TEST_AND_COVERAGE)
        .category(JAVASCRIPT_CATEGORY)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.JQUERY_OBJECT_ALIASES)
        .defaultValue(JavaScriptPlugin.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE)
        .name("jQuery object aliases")
        .description("Comma-separated list of names used to address jQuery object.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .subCategory(LIBRARIES)
        .category(JAVASCRIPT_CATEGORY)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.ENVIRONMENTS)
        .defaultValue(JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE)
        .name("JavaScript execution environments")
        .description("Comma-separated list of environments names. The analyzer automatically adds global variables based on that list. "
          + "Available environment names: " + JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE + ".")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(JAVASCRIPT_CATEGORY)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.GLOBALS)
        .defaultValue(JavaScriptPlugin.GLOBALS_DEFAULT_VALUE)
        .name("Global variables")
        .description("Comma-separated list of global variables.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(JAVASCRIPT_CATEGORY)
        .build()
    );



    if (isAtLeastSq62) {
      context.addExtension(PropertyDefinition.builder(LCOV_REPORT_PATHS)
        .defaultValue(LCOV_REPORT_PATHS_DEFAULT_VALUE)
        .name("LCOV Files")
        .description("Paths (absolute or relative) to the files with LCOV data.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .subCategory(TEST_AND_COVERAGE)
        .category(JAVASCRIPT_CATEGORY)
        .build());

    } else {
      context.addExtension(
        PropertyDefinition.builder(FORCE_ZERO_COVERAGE_KEY)
        .defaultValue(FORCE_ZERO_COVERAGE_DEFAULT_VALUE)
        .name("Force 0 coverage value")
        .description("Force coverage to be set to 0 when no report is provided.")
        .onQualifiers(Qualifiers.MODULE, Qualifiers.PROJECT)
        .type(PropertyType.BOOLEAN)
        .subCategory(TEST_AND_COVERAGE)
        .category(JAVASCRIPT_CATEGORY)
        .build());
    }



  }
}
