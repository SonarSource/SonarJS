/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.Plugin;
import org.sonar.api.PropertyType;
import org.sonar.api.SonarProduct;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.api.resources.Qualifiers;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssProfileDefinition;
import org.sonar.css.CssRulesDefinition;
import org.sonar.css.StylelintReportSensor;
import org.sonar.css.metrics.CssMetricSensor;
import org.sonar.plugins.javascript.analysis.AnalysisConsumers;
import org.sonar.plugins.javascript.analysis.AnalysisProcessor;
import org.sonar.plugins.javascript.analysis.AnalysisWithProgram;
import org.sonar.plugins.javascript.analysis.AnalysisWithWatchProgram;
import org.sonar.plugins.javascript.analysis.CssRuleSensor;
import org.sonar.plugins.javascript.analysis.HtmlSensor;
import org.sonar.plugins.javascript.analysis.JsTsChecks;
import org.sonar.plugins.javascript.analysis.JsTsSensor;
import org.sonar.plugins.javascript.sonarlint.TsConfigCacheImpl;
import org.sonar.plugins.javascript.analysis.TsConfigProvider;
import org.sonar.plugins.javascript.analysis.YamlSensor;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.BundleImpl;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;
import org.sonar.plugins.javascript.bridge.Environment;
import org.sonar.plugins.javascript.bridge.NodeDeprecationWarning;
import org.sonar.plugins.javascript.bridge.RulesBundles;
import org.sonar.plugins.javascript.external.EslintReportSensor;
import org.sonar.plugins.javascript.external.TslintReportSensor;
import org.sonar.plugins.javascript.filter.JavaScriptExclusionsFileFilter;
import org.sonar.plugins.javascript.lcov.CoverageSensor;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;
import org.sonar.plugins.javascript.rules.EslintRulesDefinition;
import org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition;
import org.sonar.plugins.javascript.rules.TslintRulesDefinition;
import org.sonar.plugins.javascript.rules.TypeScriptRulesDefinition;

public class JavaScriptPlugin implements Plugin {

  public static final String TYPESCRIPT_VERSION = "5.3.2";
  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptPlugin.class);

  // Subcategories

  private static final String GENERAL = "General";
  private static final String TEST_AND_COVERAGE = "Tests and Coverage";
  private static final String JS_TS_CATEGORY = "JavaScript / TypeScript";
  private static final String TS_SUB_CATEGORY = "TypeScript";
  private static final String CSS_CATEGORY = "CSS";

  // Global JavaScript constants

  public static final String PROPERTY_PREFIX = "sonar.javascript";

  public static final String LCOV_REPORT_PATHS = PROPERTY_PREFIX + ".lcov.reportPaths";
  public static final String LCOV_REPORT_PATHS_ALIAS = "sonar.typescript.lcov.reportPaths";
  public static final String LCOV_REPORT_PATHS_DEFAULT_VALUE = "";

  public static final String ENVIRONMENTS = "sonar.javascript.environments";
  public static final String[] ENVIRONMENTS_DEFAULT_VALUE = {
    "amd",
    "applescript",
    "atomtest",
    "browser",
    "commonjs",
    "embertest",
    "greasemonkey",
    "jasmine",
    "jest",
    "jquery",
    "meteor",
    "mocha",
    "mongo",
    "nashorn",
    "node",
    "phantomjs",
    "prototypejs",
    "protractor",
    "qunit",
    "serviceworker",
    "shared-node-browser",
    "shelljs",
    "webextensions",
    "worker",
  };

  public static final String GLOBALS = "sonar.javascript.globals";
  public static final String GLOBALS_DEFAULT_VALUE =
    "angular,goog,google,OpenLayers,d3,dojo,dojox,dijit,Backbone,moment,casper,_,sap";

  public static final String IGNORE_HEADER_COMMENTS = PROPERTY_PREFIX + ".ignoreHeaderComments";
  public static final Boolean IGNORE_HEADER_COMMENTS_DEFAULT_VALUE = true;

  public static final String JS_EXCLUSIONS_KEY = PROPERTY_PREFIX + ".exclusions";
  public static final String TS_EXCLUSIONS_KEY = "sonar.typescript.exclusions";
  public static final String[] EXCLUSIONS_DEFAULT_VALUE = new String[] {
    "**/node_modules/**",
    "**/bower_components/**",
    "**/dist/**",
    "**/vendor/**",
    "**/external/**",
    "**/*.d.ts",
  };

  public static final String EXTERNAL_ANALYZERS_CATEGORY = "External Analyzers";
  public static final String EXTERNAL_ANALYZERS_SUB_CATEGORY = "JavaScript/TypeScript";
  public static final String ESLINT_REPORT_PATHS = "sonar.eslint.reportPaths";
  public static final String TSLINT_REPORT_PATHS = "sonar.typescript.tslint.reportPaths";

  private static final String FILE_SUFFIXES_DESCRIPTION = "List of suffixes for files to analyze.";

  public static final String PROPERTY_KEY_MAX_FILE_SIZE = "sonar.javascript.maxFileSize";
  public static final String SKIP_NODE_PROVISIONING_PROPERTY = "sonar.scanner.skipNodeProvisioning";

  @Override
  public void define(Context context) {
    context.addExtensions(
      AnalysisConsumers.class,
      JavaScriptLanguage.class,
      JavaScriptExclusionsFileFilter.class,
      JavaScriptRulesDefinition.class,
      JavaScriptProfilesDefinition.class,
      NodeCommandBuilderImpl.class,
      ProcessWrapperImpl.class,
      BridgeServerImpl.class,
      NodeDeprecationWarning.class,
      BundleImpl.class,
      JsTsSensor.class,
      TypeScriptLanguage.class,
      TypeScriptRulesDefinition.class,
      RulesBundles.class,
      JsTsChecks.class,
      AnalysisWarningsWrapper.class,
      AnalysisWithProgram.class,
      AnalysisWithWatchProgram.class,
      AnalysisProcessor.class,
      YamlSensor.class,
      HtmlSensor.class,
      EmbeddedNode.class,
      Environment.class
    );

    context.addExtensions(
      PropertyDefinition
        .builder(LCOV_REPORT_PATHS)
        .defaultValue(LCOV_REPORT_PATHS_DEFAULT_VALUE)
        .name("LCOV Files")
        .description("Paths (absolute or relative) to the files with LCOV data.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(TEST_AND_COVERAGE)
        .category(JS_TS_CATEGORY)
        .multiValues(true)
        .build(),
      PropertyDefinition
        .builder(JavaScriptLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE)
        .name("JavaScript File Suffixes")
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .multiValues(true)
        .onQualifiers(Qualifiers.PROJECT)
        .build(),
      PropertyDefinition
        .builder(TypeScriptLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(TypeScriptLanguage.FILE_SUFFIXES_DEFVALUE)
        .name("TypeScript File Suffixes")
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .onQualifiers(Qualifiers.PROJECT)
        .multiValues(true)
        .build(),
      PropertyDefinition
        .builder(TsConfigProvider.TSCONFIG_PATHS)
        .name("TypeScript tsconfig.json location")
        .description("Comma-delimited list of paths to TSConfig files. Wildcards are supported.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(TS_SUB_CATEGORY)
        .category(JS_TS_CATEGORY)
        .multiValues(true)
        .build(),
      PropertyDefinition
        .builder(PROPERTY_KEY_MAX_FILE_SIZE)
        .name("Maximum size of analyzed files")
        .description(
          "Threshold for the maximum size of analyzed files (in kilobytes). " +
          "Files that are larger are excluded from the analysis."
        )
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .type(PropertyType.INTEGER)
        .defaultValue("1000")
        .build(),
      PropertyDefinition
        .builder(JavaScriptPlugin.IGNORE_HEADER_COMMENTS)
        .defaultValue(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE.toString())
        .name("Ignore header comments")
        .description("True to not count file header comments in comment metrics.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .type(PropertyType.BOOLEAN)
        .build(),
      PropertyDefinition
        .builder(JavaScriptPlugin.ENVIRONMENTS)
        .defaultValue(String.join(",", JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE))
        .name("JavaScript execution environments")
        .description(
          "List of environments names. The analyzer automatically adds global variables based on that list. " +
          "Available environment names: " +
          String.join(", ", JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE) +
          "."
        )
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .multiValues(true)
        .category(JS_TS_CATEGORY)
        .build(),
      PropertyDefinition
        .builder(JavaScriptPlugin.GLOBALS)
        .defaultValue(JavaScriptPlugin.GLOBALS_DEFAULT_VALUE)
        .name("Global variables")
        .description("List of global variables.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .multiValues(true)
        .category(JS_TS_CATEGORY)
        .build(),
      PropertyDefinition
        .builder(SKIP_NODE_PROVISIONING_PROPERTY)
        .defaultValue("false")
        .name("Skip the deployment of the embedded Node.js runtime")
        .description("Controls whether the scanner should skip the deployment of the embedded Node.js runtime, and use the host-provided runtime instead.")
        .onQualifiers(Qualifiers.PROJECT)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .type(PropertyType.BOOLEAN)
        .build()
    );

    context.addExtensions(
      CssLanguage.class,
      CssProfileDefinition.class,
      CssRulesDefinition.class,
      CssRuleSensor.class
    );

    context.addExtension(
      PropertyDefinition
        .builder(CssLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(CssLanguage.FILE_SUFFIXES_DEFVALUE)
        .name("File Suffixes")
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(CSS_CATEGORY)
        .onQualifiers(Qualifiers.PROJECT)
        .multiValues(true)
        .build()
    );

    if (!context.getRuntime().getProduct().equals(SonarProduct.SONARLINT)) {
      context.addExtensions(
        CoverageSensor.class,
        EslintReportSensor.class,
        EslintRulesDefinition.class,
        TslintReportSensor.class,
        TslintRulesDefinition.class
      );

      context.addExtension(
        PropertyDefinition
          .builder(ESLINT_REPORT_PATHS)
          .name("ESLint Report Files")
          .description("Paths (absolute or relative) to the JSON files with ESLint issues.")
          .onQualifiers(Qualifiers.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory(EXTERNAL_ANALYZERS_SUB_CATEGORY)
          .multiValues(true)
          .build()
      );

      context.addExtension(
        PropertyDefinition
          .builder(TSLINT_REPORT_PATHS)
          .name("TSLint Report Files")
          .description("Paths (absolute or relative) to the JSON files with TSLint issues.")
          .onQualifiers(Qualifiers.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory(EXTERNAL_ANALYZERS_SUB_CATEGORY)
          .multiValues(true)
          .build()
      );

      context.addExtensions(CssMetricSensor.class, StylelintReportSensor.class);

      context.addExtension(
        PropertyDefinition
          .builder(StylelintReportSensor.STYLELINT_REPORT_PATHS)
          .defaultValue(StylelintReportSensor.STYLELINT_REPORT_PATHS_DEFAULT_VALUE)
          .name("Stylelint Report Files")
          .description("Paths (absolute or relative) to the JSON files with stylelint issues.")
          .onQualifiers(Qualifiers.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory("CSS")
          .multiValues(true)
          .build()
      );
    } else {
      var sonarLintPluginAPIManager = new SonarLintPluginAPIManager();
      sonarLintPluginAPIManager.addSonarLintExtensions(
        context,
        new SonarLintPluginAPIVersion()
      );
    }
  }

  static class SonarLintPluginAPIManager {

    public void addSonarLintExtensions(
      Context context,
      SonarLintPluginAPIVersion sonarLintPluginAPIVersion
    ) {
      if (sonarLintPluginAPIVersion.isDependencyAvailable()) {
        context.addExtension(TsConfigCacheImpl.class);
      } else {
        LOG.debug("Error while trying to inject SonarLint extensions");
      }
    }
  }

  static class SonarLintPluginAPIVersion {

    boolean isDependencyAvailable() {
      try {
        Class.forName("org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener");
      } catch (ClassNotFoundException e) {
        return false;
      }
      return true;
    }
  }
}
