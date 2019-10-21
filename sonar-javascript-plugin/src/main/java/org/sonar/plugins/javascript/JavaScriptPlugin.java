/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import org.sonar.api.SonarProduct;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.resources.Qualifiers;
import org.sonar.javascript.tree.symbols.GlobalVariableNames;
import org.sonar.javascript.tree.symbols.type.JQuery;
import org.sonar.plugins.javascript.eslint.BundleImpl;
import org.sonar.plugins.javascript.eslint.EslintBridgeServerImpl;
import org.sonar.plugins.javascript.eslint.JavaScriptEslintBasedSensor;
import org.sonar.plugins.javascript.eslint.TypeScriptSensor;
import org.sonar.plugins.javascript.external.EslintReportSensor;
import org.sonar.plugins.javascript.external.TslintReportSensor;
import org.sonar.plugins.javascript.lcov.CoverageSensor;
import org.sonar.plugins.javascript.rules.EslintRulesDefinition;
import org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition;
import org.sonar.plugins.javascript.rules.TslintRulesDefinition;
import org.sonar.plugins.javascript.rules.TypeScriptRulesDefinition;
import org.sonarsource.nodejs.NodeCommand;

public class JavaScriptPlugin implements Plugin {


  // Subcategories

  private static final String GENERAL = "General";
  private static final String TEST_AND_COVERAGE = "Tests and Coverage";
  private static final String LIBRARIES = "Libraries";
  private static final String JAVASCRIPT_CATEGORY = "JavaScript";
  private static final String TYPESCRIPT_CATEGORY = "TypeScript";

  // Global JavaScript constants

  public static final String PROPERTY_PREFIX = "sonar.javascript";

  public static final String LCOV_REPORT_PATHS = PROPERTY_PREFIX + ".lcov.reportPaths";
  public static final String LCOV_REPORT_PATHS_DEFAULT_VALUE = "";

  public static final String JQUERY_OBJECT_ALIASES = JQuery.JQUERY_OBJECT_ALIASES;
  public static final String JQUERY_OBJECT_ALIASES_DEFAULT_VALUE = JQuery.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE;

  public static final String ENVIRONMENTS = GlobalVariableNames.ENVIRONMENTS_PROPERTY_KEY;
  public static final String ENVIRONMENTS_DEFAULT_VALUE = GlobalVariableNames.ENVIRONMENTS_DEFAULT_VALUE;

  public static final String GLOBALS = GlobalVariableNames.GLOBALS_PROPERTY_KEY;
  public static final String GLOBALS_DEFAULT_VALUE = GlobalVariableNames.GLOBALS_DEFAULT_VALUE;

  public static final String IGNORE_HEADER_COMMENTS = PROPERTY_PREFIX + ".ignoreHeaderComments";
  public static final Boolean IGNORE_HEADER_COMMENTS_DEFAULT_VALUE = true;

  public static final String JS_EXCLUSIONS_KEY = PROPERTY_PREFIX + ".exclusions";
  public static final String JS_EXCLUSIONS_DEFAULT_VALUE = "**/node_modules/**,**/bower_components/**";
  public static final String TS_EXCLUSIONS_KEY = "sonar.typescript.exclusions";

  public static final String EXTERNAL_ANALYZERS_CATEGORY = "External Analyzers";
  public static final String EXTERNAL_ANALYZERS_SUB_CATEGORY = "JavaScript/TypeScript";
  public static final String ESLINT_REPORT_PATHS = "sonar.eslint.reportPaths";
  public static final String TSLINT_REPORT_PATHS = "sonar.typescript.tslint.reportPaths";

  public static final String DEPRECATED_ESLINT_PROPERTY = "sonar.typescript.eslint.reportPaths";

  private static final String FILE_SUFFIXES_DESCRIPTION = "List of suffixes for files to analyze.";
  private static final String FILE_SUFFIXES_NAME = "File Suffixes";

  public static final String TS_LCOV_REPORT_PATHS = "sonar.typescript.lcov.reportPaths";
  public static final String TS_LCOV_REPORT_PATHS_DEFAULT_VALUE = "";

  public static final String TSCONFIG_PATH = "sonar.typescript.tsconfigPath";

  @Override
  public void define(Context context) {
    context.addExtensions(
      JavaScriptLanguage.class,
      JavaScriptSensor.class,
      JavaScriptExclusionsFileFilter.class,
      JavaScriptRulesDefinition.class,
      JavaScriptProfilesDefinition.class,
      NodeCommand.builder(),
      EslintBridgeServerImpl.class,
      BundleImpl.class,
      JavaScriptEslintBasedSensor.class
    );

    context.addExtensions(
      PropertyDefinition.builder(LCOV_REPORT_PATHS)
        .defaultValue(LCOV_REPORT_PATHS_DEFAULT_VALUE)
        .name("LCOV Files")
        .description("Paths (absolute or relative) to the files with LCOV data.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(TEST_AND_COVERAGE)
        .category(JAVASCRIPT_CATEGORY)
        .multiValues(true)
        .build(),

      PropertyDefinition.builder(JavaScriptLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE)
        .name(FILE_SUFFIXES_NAME)
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(JAVASCRIPT_CATEGORY)
        .multiValues(true)
        .onQualifiers(Qualifiers.PROJECT)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.IGNORE_HEADER_COMMENTS)
        .defaultValue(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE.toString())
        .name("Ignore header comments")
        .description("True to not count file header comments in comment metrics.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(JAVASCRIPT_CATEGORY)
        .type(PropertyType.BOOLEAN)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.JQUERY_OBJECT_ALIASES)
        .defaultValue(JavaScriptPlugin.JQUERY_OBJECT_ALIASES_DEFAULT_VALUE)
        .name("jQuery object aliases")
        .description("List of names used to address jQuery object.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(LIBRARIES)
        .multiValues(true)
        .category(JAVASCRIPT_CATEGORY)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.ENVIRONMENTS)
        .defaultValue(JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE)
        .name("JavaScript execution environments")
        .description("List of environments names. The analyzer automatically adds global variables based on that list. "
          + "Available environment names: " + JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE + ".")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .multiValues(true)
        .category(JAVASCRIPT_CATEGORY)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.GLOBALS)
        .defaultValue(JavaScriptPlugin.GLOBALS_DEFAULT_VALUE)
        .name("Global variables")
        .description("List of global variables.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .multiValues(true)
        .category(JAVASCRIPT_CATEGORY)
        .build(),

      PropertyDefinition.builder(JavaScriptPlugin.JS_EXCLUSIONS_KEY)
        .defaultValue(JS_EXCLUSIONS_DEFAULT_VALUE)
        .name("JavaScript Exclusions")
        .description("List of file path patterns to be excluded from analysis of JavaScript files.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .multiValues(true)
        .category(JAVASCRIPT_CATEGORY)
        .build()
    );

    if (!context.getRuntime().getProduct().equals(SonarProduct.SONARLINT)) {
      context.addExtension(CoverageSensor.class);
      context.addExtension(EslintReportSensor.class);
      context.addExtension(EslintRulesDefinition.class);

      context.addExtension(
        PropertyDefinition.builder(ESLINT_REPORT_PATHS)
          .name("ESLint Report Files")
          .description("Paths (absolute or relative) to the JSON files with ESLint issues.")
          .onQualifiers(Qualifiers.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory(EXTERNAL_ANALYZERS_SUB_CATEGORY)
          .multiValues(true)
          .build());
    }

    addTypeScriptExtensions(context);
  }

  private static void addTypeScriptExtensions(Context context) {
    context.addExtensions(
      TypeScriptSensor.class,
      TypeScriptLanguage.class,
      TypeScriptRulesDefinition.class,

      PropertyDefinition.builder(TypeScriptLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(TypeScriptLanguage.FILE_SUFFIXES_DEFVALUE)
        .name(FILE_SUFFIXES_NAME)
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(TYPESCRIPT_CATEGORY)
        .onQualifiers(Qualifiers.PROJECT)
        .multiValues(true)
        .build(),

      PropertyDefinition.builder(TS_LCOV_REPORT_PATHS)
        .defaultValue(TS_LCOV_REPORT_PATHS_DEFAULT_VALUE)
        .name("LCOV Files")
        .description("DEPRECATED - Use " + LCOV_REPORT_PATHS + " instead. \n" +
          "Paths (absolute or relative) to the files with LCOV data.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(TEST_AND_COVERAGE)
        .category(TYPESCRIPT_CATEGORY)
        .multiValues(true)
        .build(),

      PropertyDefinition.builder(TSCONFIG_PATH)
        .name("tsconfig.json location")
        .description("Path (relative to project base or absolute) to the tsconfig JSON file")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(TYPESCRIPT_CATEGORY)
        .build()
    );

    if (!context.getRuntime().getProduct().equals(SonarProduct.SONARLINT)) {
      context.addExtension(TslintReportSensor.class);
      context.addExtension(TslintRulesDefinition.class);

      context.addExtension(
        PropertyDefinition.builder(TSLINT_REPORT_PATHS)
          .name("TSLint Report Files")
          .description("Paths (absolute or relative) to the JSON files with TSLint issues.")
          .onQualifiers(Qualifiers.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory(EXTERNAL_ANALYZERS_SUB_CATEGORY)
          .multiValues(true)
          .build());
    }
  }
}
