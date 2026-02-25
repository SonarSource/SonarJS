/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
package org.sonar.plugins.javascript;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.Plugin;
import org.sonar.api.PropertyType;
import org.sonar.api.SonarProduct;
import org.sonar.api.config.PropertyDefinition;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssProfileDefinition;
import org.sonar.css.CssRules;
import org.sonar.css.CssRulesDefinition;
import org.sonar.css.StylelintReportSensor;
import org.sonar.plugins.javascript.analysis.AnalysisConsumers;
import org.sonar.plugins.javascript.analysis.AnalysisProcessor;
import org.sonar.plugins.javascript.analysis.JsTsChecks;
import org.sonar.plugins.javascript.analysis.JsTsExclusionsFilter;
import org.sonar.plugins.javascript.analysis.WebSensor;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.BundleImpl;
import org.sonar.plugins.javascript.bridge.EmbeddedNode;
import org.sonar.plugins.javascript.bridge.Environment;
import org.sonar.plugins.javascript.bridge.NodeDeprecationWarning;
import org.sonar.plugins.javascript.bridge.RulesBundles;
import org.sonar.plugins.javascript.bridge.TsgolintBundle;
import org.sonar.plugins.javascript.external.TslintReportSensor;
import org.sonar.plugins.javascript.lcov.CoverageSensor;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;
import org.sonar.plugins.javascript.rules.EslintRulesDefinition;
import org.sonar.plugins.javascript.rules.JavaScriptRulesDefinition;
import org.sonar.plugins.javascript.rules.TslintRulesDefinition;
import org.sonar.plugins.javascript.rules.TypeScriptRulesDefinition;
import org.sonar.plugins.javascript.sonarlint.FSListenerImpl;

public class JavaScriptPlugin implements Plugin {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptPlugin.class);

  // Subcategories

  private static final String GENERAL = "General";
  private static final String TEST_AND_COVERAGE = "Tests and Coverage";
  private static final String JS_TS_CATEGORY = "JavaScript / TypeScript";
  private static final String TS_SUB_CATEGORY = "TypeScript";
  private static final String CSS_CATEGORY = "CSS";

  // Global JavaScript constants

  public static final String LCOV_REPORT_PATHS = "sonar.javascript.lcov.reportPaths";
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

  public static final String IGNORE_HEADER_COMMENTS = "sonar.javascript.ignoreHeaderComments";
  public static final Boolean IGNORE_HEADER_COMMENTS_DEFAULT_VALUE = true;

  public static final String JS_EXCLUSIONS_KEY = "sonar.javascript.exclusions";
  public static final String TS_EXCLUSIONS_KEY = "sonar.typescript.exclusions";
  public static final String[] EXCLUSIONS_DEFAULT_VALUE = new String[] {
    "**/.git/**",
    "**/node_modules/**",
    "**/bower_components/**",
    "**/dist/**",
    "**/vendor/**",
    "**/external/**",
    "**/contrib/**",
    "**/*.d.ts",
  };

  public static final String EXTERNAL_ANALYZERS_CATEGORY = "External Analyzers";
  public static final String EXTERNAL_ANALYZERS_SUB_CATEGORY = "JavaScript/TypeScript";
  public static final String ESLINT_REPORT_PATHS = "sonar.eslint.reportPaths";
  public static final String TSLINT_REPORT_PATHS = "sonar.typescript.tslint.reportPaths";

  private static final String FILE_SUFFIXES_DESCRIPTION = "List of suffixes for files to analyze.";
  public static final String PROPERTY_KEY_MAX_FILE_SIZE = "sonar.javascript.maxFileSize";
  public static final long DEFAULT_MAX_FILE_SIZE_KB = 1000L; // 1MB

  public static final String TSCONFIG_PATHS = "sonar.typescript.tsconfigPaths";
  public static final String TSCONFIG_PATHS_ALIAS = "sonar.typescript.tsconfigPath";

  public static final String SKIP_NODE_PROVISIONING_PROPERTY = "sonar.scanner.skipNodeProvisioning";
  public static final String DETECT_BUNDLES_PROPERTY = "sonar.javascript.detectBundles";
  public static final String NO_FS = "sonar.javascript.canAccessFileSystem";
  public static final String CREATE_TS_PROGRAM_FOR_ORPHAN_FILES =
    "sonar.javascript.createTSProgramForOrphanFiles";

  @Override
  public void define(Context context) {
    context.addExtensions(
      AnalysisConsumers.class,
      JavaScriptLanguage.class,
      JavaScriptRulesDefinition.class,
      JavaScriptProfilesDefinition.class,
      JsTsExclusionsFilter.class,
      NodeCommandBuilderImpl.class,
      ProcessWrapperImpl.class,
      BridgeServerImpl.class,
      NodeDeprecationWarning.class,
      BundleImpl.class,
      WebSensor.class,
      TypeScriptLanguage.class,
      TypeScriptRulesDefinition.class,
      RulesBundles.class,
      JsTsChecks.class,
      AnalysisWarningsWrapper.class,
      AnalysisProcessor.class,
      EmbeddedNode.class,
      Environment.class,
      TsgolintBundle.class
    );

    context.addExtensions(
      PropertyDefinition.builder(LCOV_REPORT_PATHS)
        .defaultValue(LCOV_REPORT_PATHS_DEFAULT_VALUE)
        .name("LCOV Files")
        .description("Paths (absolute or relative) to the files with LCOV data.")
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(TEST_AND_COVERAGE)
        .category(JS_TS_CATEGORY)
        .multiValues(true)
        .build(),
      PropertyDefinition.builder(JavaScriptLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(JavaScriptLanguage.DEFAULT_FILE_SUFFIXES)
        .name("JavaScript File Suffixes")
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .multiValues(true)
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .build(),
      PropertyDefinition.builder(TypeScriptLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(TypeScriptLanguage.DEFAULT_FILE_SUFFIXES)
        .name("TypeScript File Suffixes")
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .multiValues(true)
        .build(),
      PropertyDefinition.builder(TSCONFIG_PATHS)
        .name("TypeScript tsconfig.json location")
        .description("Comma-delimited list of paths to TSConfig files. Wildcards are supported.")
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(TS_SUB_CATEGORY)
        .category(JS_TS_CATEGORY)
        .multiValues(true)
        .build(),
      PropertyDefinition.builder(PROPERTY_KEY_MAX_FILE_SIZE)
        .name("Maximum size of analyzed files")
        .description(
          "Threshold for the maximum size of analyzed files (in kilobytes). " +
            "Files that are larger are excluded from the analysis."
        )
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .type(PropertyType.INTEGER)
        .defaultValue("1000")
        .build(),
      PropertyDefinition.builder(IGNORE_HEADER_COMMENTS)
        .defaultValue(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE.toString())
        .name("Ignore header comments")
        .description("True to not count file header comments in comment metrics.")
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .type(PropertyType.BOOLEAN)
        .build(),
      PropertyDefinition.builder(ENVIRONMENTS)
        .defaultValue(String.join(",", JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE))
        .name("JavaScript execution environments")
        .description(
          "List of environments names. The analyzer automatically adds global variables based on that list. " +
            "Available environment names: " +
            String.join(", ", JavaScriptPlugin.ENVIRONMENTS_DEFAULT_VALUE) +
            "."
        )
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(GENERAL)
        .multiValues(true)
        .category(JS_TS_CATEGORY)
        .build(),
      PropertyDefinition.builder(GLOBALS)
        .defaultValue(JavaScriptPlugin.GLOBALS_DEFAULT_VALUE)
        .name("Global variables")
        .description("List of global variables.")
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(GENERAL)
        .multiValues(true)
        .category(JS_TS_CATEGORY)
        .build(),
      PropertyDefinition.builder(SKIP_NODE_PROVISIONING_PROPERTY)
        .defaultValue("false")
        .name("Skip the deployment of the embedded Node.js runtime")
        .description(
          JavaScriptPlugin.getHTMLMarkup(
            "Controls whether the scanner should skip the deployment of the embedded Node.js runtime, and use the host-provided runtime instead.\n\nAnalysis will fail if a compatible version of Node.js is not provided via `sonar.nodejs.executable` or the `PATH`."
          )
        )
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(GENERAL)
        .category(JS_TS_CATEGORY)
        .type(PropertyType.BOOLEAN)
        .build(),
      PropertyDefinition.builder(CREATE_TS_PROGRAM_FOR_ORPHAN_FILES)
        .defaultValue("true")
        .name("Create TypeScript program for orphan files")
        .description(
          "Controls whether a TypeScript program should be created for files not included in any tsconfig.json. " +
            "When disabled, orphan files are analyzed without type information, which is faster but may reduce analysis accuracy."
        )
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .subCategory(TS_SUB_CATEGORY)
        .category(JS_TS_CATEGORY)
        .type(PropertyType.BOOLEAN)
        .build()
    );

    context.addExtensions(
      CssLanguage.class,
      CssProfileDefinition.class,
      CssRulesDefinition.class,
      CssRules.class
    );

    context.addExtension(
      PropertyDefinition.builder(CssLanguage.FILE_SUFFIXES_KEY)
        .defaultValue(CssLanguage.DEFAULT_FILE_SUFFIXES)
        .name("File Suffixes")
        .description(FILE_SUFFIXES_DESCRIPTION)
        .subCategory(GENERAL)
        .category(CSS_CATEGORY)
        .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
        .multiValues(true)
        .build()
    );

    if (!context.getRuntime().getProduct().equals(SonarProduct.SONARLINT)) {
      context.addExtensions(
        CoverageSensor.class,
        EslintRulesDefinition.class,
        TslintReportSensor.class,
        TslintRulesDefinition.class
      );

      context.addExtension(
        PropertyDefinition.builder(ESLINT_REPORT_PATHS)
          .name("ESLint Report Files")
          .description("Paths (absolute or relative) to the JSON files with ESLint issues.")
          .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory(EXTERNAL_ANALYZERS_SUB_CATEGORY)
          .multiValues(true)
          .build()
      );

      context.addExtension(
        PropertyDefinition.builder(TSLINT_REPORT_PATHS)
          .name("TSLint Report Files")
          .description("Paths (absolute or relative) to the JSON files with TSLint issues.")
          .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory(EXTERNAL_ANALYZERS_SUB_CATEGORY)
          .multiValues(true)
          .build()
      );

      context.addExtension(StylelintReportSensor.class);

      context.addExtension(
        PropertyDefinition.builder(StylelintReportSensor.STYLELINT_REPORT_PATHS)
          .defaultValue(StylelintReportSensor.STYLELINT_REPORT_PATHS_DEFAULT_VALUE)
          .name("Stylelint Report Files")
          .description("Paths (absolute or relative) to the JSON files with stylelint issues.")
          .onConfigScopes(PropertyDefinition.ConfigScope.PROJECT)
          .category(EXTERNAL_ANALYZERS_CATEGORY)
          .subCategory("CSS")
          .multiValues(true)
          .build()
      );
    } else {
      var sonarLintPluginAPIManager = new SonarLintPluginAPIManager();
      sonarLintPluginAPIManager.addSonarLintExtensions(context, new SonarLintPluginAPIVersion());
    }
  }

  /**
   * From a Markdown markup, returns the corresponding HTML markup.
   *
   * Note that this method should probably not be hosted here: either it should be part of a dedicated helper class, or it should be provided by a Markdown-to-HTML library. Since it is only used in this specific class, it is acceptable for now to have it hosted here.
   */
  private static String getHTMLMarkup(String markdownMarkup) {
    return markdownMarkup.replace("\n", "<br>").replaceAll("`(.*?)`", "<code>$1</code>");
  }

  static class SonarLintPluginAPIManager {

    public void addSonarLintExtensions(
      Context context,
      SonarLintPluginAPIVersion sonarLintPluginAPIVersion
    ) {
      if (sonarLintPluginAPIVersion.isDependencyAvailable()) {
        //TODO feature flags should be used to just enable one of the file event listeners
        context.addExtension(FSListenerImpl.class);
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
