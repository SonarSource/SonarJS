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
package org.sonar.plugins.javascript.analysis;

import static java.util.Arrays.stream;
import static java.util.Collections.emptySet;
import static java.util.stream.Stream.concat;
import static org.sonar.plugins.javascript.JavaScriptPlugin.DEFAULT_MAX_FILE_SIZE_KB;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS_ALIAS;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.config.Configuration;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.bridge.AnalysisConfiguration;

public class JsTsContext<T extends SensorContext> implements AnalysisConfiguration {

  private static final String ALLOW_TS_PARSER_JS_FILES = "sonar.javascript.allowTsParserJsFiles";

  private static final Logger LOG = LoggerFactory.getLogger(JsTsContext.class);

  private final T context;

  public JsTsContext(T context) {
    this.context = context;
  }

  public T getSensorContext() {
    return context;
  }

  public boolean isSonarLint() {
    return context.runtime().getProduct() == SonarProduct.SONARLINT;
  }

  public boolean isSonarQube() {
    return context.runtime().getProduct() == SonarProduct.SONARQUBE;
  }

  public boolean ignoreHeaderComments() {
    return context
      .config()
      .getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS)
      .orElse(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE);
  }

  public boolean shouldSendFileContent(InputFile file) {
    return isSonarLint() || !StandardCharsets.UTF_8.equals(file.charset());
  }

  public boolean failFast() {
    return context.config().getBoolean("sonar.internal.analysis.failFast").orElse(false);
  }

  public boolean allowTsParserJsFiles() {
    return context.config().getBoolean(ALLOW_TS_PARSER_JS_FILES).orElse(true);
  }

  public AnalysisMode getAnalysisMode() {
    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    if (!canSkipUnchangedFiles) {
      return AnalysisMode.DEFAULT;
    }

    return AnalysisMode.SKIP_UNCHANGED;
  }

  public List<String> getEnvironments() {
    return Arrays.asList(context.config().getStringArray(JavaScriptPlugin.ENVIRONMENTS));
  }

  public List<String> getGlobals() {
    return Arrays.asList(context.config().getStringArray(JavaScriptPlugin.GLOBALS));
  }

  public static long getMaxFileSizeProperty(Configuration configuration) {
    var property = configuration.get(JavaScriptPlugin.PROPERTY_KEY_MAX_FILE_SIZE);
    if (property.isPresent()) {
      var propertyValue = property.get();
      try {
        var maxFileSize = Long.parseLong(propertyValue);
        if (maxFileSize <= 0) {
          LOG.warn(
            "Maximum file size (sonar.javascript.maxFileSize) is not strictly positive: {}, falling back to {}.",
            propertyValue,
            DEFAULT_MAX_FILE_SIZE_KB
          );
        }
        return maxFileSize;
      } catch (NumberFormatException e) {
        LOG.warn(
          "Maximum file size (sonar.javascript.maxFileSize) is not an integer: \"{}\", falling back to {}.",
          propertyValue,
          DEFAULT_MAX_FILE_SIZE_KB
        );
      }
    }
    return DEFAULT_MAX_FILE_SIZE_KB;
  }

  public long getMaxFileSizeProperty() {
    return getMaxFileSizeProperty(context.config());
  }

  public boolean skipAst(AnalysisConsumers consumers) {
    return (!consumers.isEnabled());
  }

  public Set<String> getTsConfigPaths() {
    if (
      !context.config().hasKey(TSCONFIG_PATHS) && !context.config().hasKey(TSCONFIG_PATHS_ALIAS)
    ) {
      return emptySet();
    }

    String property = context.config().hasKey(TSCONFIG_PATHS)
      ? TSCONFIG_PATHS
      : TSCONFIG_PATHS_ALIAS;
    return new LinkedHashSet<>(List.of(context.config().getStringArray(property)));
  }

  public static List<String> getJsExtensions(Configuration config) {
    return List.of(
      config.hasKey(JavaScriptLanguage.FILE_SUFFIXES_KEY)
        ? config.getStringArray(JavaScriptLanguage.FILE_SUFFIXES_KEY)
        : JavaScriptLanguage.DEFAULT_FILE_SUFFIXES.split(",")
    );
  }

  public List<String> getJsExtensions() {
    return getJsExtensions(context.config());
  }

  public static List<String> getTsExtensions(Configuration config) {
    return List.of(
      config.hasKey(TypeScriptLanguage.FILE_SUFFIXES_KEY)
        ? config.getStringArray(TypeScriptLanguage.FILE_SUFFIXES_KEY)
        : TypeScriptLanguage.DEFAULT_FILE_SUFFIXES.split(",")
    );
  }

  public List<String> getTsExtensions() {
    return getTsExtensions(context.config());
  }

  public Set<String> getJsTsExtensions() {
    var extensions = new HashSet<String>();
    extensions.addAll(getJsExtensions());
    extensions.addAll(getTsExtensions());
    return extensions;
  }

  public List<String> getCssExtensions() {
    return getCssExtensions(context.config());
  }

  public static List<String> getCssExtensions(Configuration config) {
    return List.of(
      config.hasKey(CssLanguage.FILE_SUFFIXES_KEY)
        ? config.getStringArray(CssLanguage.FILE_SUFFIXES_KEY)
        : CssLanguage.DEFAULT_FILE_SUFFIXES.split(",")
    );
  }

  public List<String> getJsTsExcludedPaths() {
    return Arrays.asList(getJsTsExcludedPaths(context.config()));
  }

  public static String[] getJsTsExcludedPaths(Configuration configuration) {
    if (isExclusionOverridden(configuration)) {
      return concat(
        stream(configuration.getStringArray(JavaScriptPlugin.JS_EXCLUSIONS_KEY)),
        stream(configuration.getStringArray(JavaScriptPlugin.TS_EXCLUSIONS_KEY))
      )
        .filter(x -> !x.isBlank())
        .toArray(String[]::new);
    }
    return JavaScriptPlugin.EXCLUSIONS_DEFAULT_VALUE;
  }

  private static boolean isExclusionOverridden(Configuration configuration) {
    return (
      configuration.get(JavaScriptPlugin.JS_EXCLUSIONS_KEY).isPresent() ||
      configuration.get(JavaScriptPlugin.TS_EXCLUSIONS_KEY).isPresent()
    );
  }

  public boolean shouldDetectBundles() {
    return shouldDetectBundles(context.config());
  }

  public static boolean shouldDetectBundles(Configuration config) {
    return config.getBoolean(JavaScriptPlugin.DETECT_BUNDLES_PROPERTY).orElse(true);
  }

  public boolean canAccessFileSystem() {
    return canAccessFileSystem(context.config());
  }

  public static boolean canAccessFileSystem(Configuration config) {
    return config.getBoolean(JavaScriptPlugin.NO_FS).orElse(true);
  }

  public boolean shouldCreateTSProgramForOrphanFiles() {
    return context
      .config()
      .getBoolean(JavaScriptPlugin.CREATE_TS_PROGRAM_FOR_ORPHAN_FILES)
      .orElse(true);
  }

  public boolean shouldDisableTypeChecking() {
    return context.config().getBoolean(JavaScriptPlugin.DISABLE_TYPE_CHECKING).orElse(false);
  }

  public List<String> getSources() {
    return stream(this.context.config().getStringArray("sonar.sources"))
      .filter(x -> !x.isBlank())
      .toList();
  }

  public List<String> getInclusions() {
    return stream(this.context.config().getStringArray("sonar.inclusions"))
      .filter(x -> !x.isBlank())
      .toList();
  }

  public List<String> getExclusions() {
    return stream(this.context.config().getStringArray("sonar.exclusions"))
      .filter(x -> !x.isBlank())
      .toList();
  }

  public List<String> getTests() {
    return stream(this.context.config().getStringArray("sonar.tests"))
      .filter(x -> !x.isBlank())
      .toList();
  }

  public List<String> getTestInclusions() {
    return stream(this.context.config().getStringArray("sonar.test.inclusions"))
      .filter(x -> !x.isBlank())
      .toList();
  }

  public List<String> getTestExclusions() {
    return stream(this.context.config().getStringArray("sonar.test.exclusions"))
      .filter(x -> !x.isBlank())
      .toList();
  }
}
