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
package org.sonar.plugins.javascript.analysis;

import static java.util.Arrays.stream;
import static java.util.Collections.emptyList;
import static java.util.stream.Stream.concat;
import static org.sonar.plugins.javascript.JavaScriptPlugin.DEFAULT_MAX_FILES_FOR_TYPE_CHECKING;
import static org.sonar.plugins.javascript.JavaScriptPlugin.DEFAULT_MAX_FILE_SIZE_KB;
import static org.sonar.plugins.javascript.JavaScriptPlugin.MAX_FILES_PROPERTY;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS_ALIAS;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.config.Configuration;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.api.AnalysisMode;

public class ContextUtils {

  private static final Logger LOG = LoggerFactory.getLogger(ContextUtils.class);

  private ContextUtils() {}

  /**
   * Internal property to enable SonarArmor (disabled by default), now called Jasmin
   * @deprecated Kept for backwards compatibility until SonarArmor has been renamed to Jasmin, to allow for a smooth transition. Roadmap:
   * 1. Merge this
   * 2. Rename SonarArmor to Jasmin on SonarArmor repository, this includes renaming the flag
   * 3. Once Jasmin renaming is on master, change the flags in the Peachee jobs
   * 4. Finally, remove this flag here
   */
  @Deprecated(forRemoval = true)
  private static final String ARMOR_INTERNAL_ENABLED = "sonar.armor.internal.enabled";

  /* Internal property to enable Jasmin (disabled by default) */
  private static final String JASMIN_INTERNAL_ENABLED = "sonar.jasmin.internal.enabled";

  /* Internal property to enable JaRED (disabled by default) */
  private static final String JARED_INTERNAL_ENABLED = "sonar.jared.internal.enabled";

  private static final String ALLOW_TS_PARSER_JS_FILES = "sonar.javascript.allowTsParserJsFiles";

  public static boolean isSonarLint(SensorContext context) {
    return context.runtime().getProduct() == SonarProduct.SONARLINT;
  }

  public static boolean isSonarQube(SensorContext context) {
    return context.runtime().getProduct() == SonarProduct.SONARQUBE;
  }

  public static boolean ignoreHeaderComments(SensorContext context) {
    return context
      .config()
      .getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS)
      .orElse(JavaScriptPlugin.IGNORE_HEADER_COMMENTS_DEFAULT_VALUE);
  }

  public static boolean shouldSendFileContent(SensorContext context, InputFile file) {
    return isSonarLint(context) || !StandardCharsets.UTF_8.equals(file.charset());
  }

  public static boolean failFast(SensorContext context) {
    return context.config().getBoolean("sonar.internal.analysis.failFast").orElse(false);
  }

  @Deprecated(forRemoval = true)
  private static boolean isSonarArmorEnabled(SensorContext context) {
    return context.config().getBoolean(ARMOR_INTERNAL_ENABLED).orElse(false);
  }

  private static boolean isSonarJasminEnabled(SensorContext context) {
    return context.config().getBoolean(JASMIN_INTERNAL_ENABLED).orElse(false);
  }

  private static boolean isSonarJaredEnabled(SensorContext context) {
    return context.config().getBoolean(JARED_INTERNAL_ENABLED).orElse(false);
  }

  public static boolean allowTsParserJsFiles(SensorContext context) {
    return context.config().getBoolean(ALLOW_TS_PARSER_JS_FILES).orElse(true);
  }

  public static AnalysisMode getAnalysisMode(SensorContext context) {
    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    if (!canSkipUnchangedFiles) {
      return AnalysisMode.DEFAULT;
    }

    return AnalysisMode.SKIP_UNCHANGED;
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

  public static int getTypeCheckingLimit(SensorContext context) {
    return Math.max(
      context.config().getInt(MAX_FILES_PROPERTY).orElse(DEFAULT_MAX_FILES_FOR_TYPE_CHECKING),
      0
    );
  }

  public static boolean skipAst(SensorContext context, AnalysisConsumers consumers) {
    return (
      !consumers.hasConsumers() ||
      !(isSonarArmorEnabled(context) ||
        isSonarJasminEnabled(context) ||
        isSonarJaredEnabled(context))
    );
  }

  static List<String> getTsConfigPaths(SensorContext context) {
    if (
      !context.config().hasKey(TSCONFIG_PATHS) && !context.config().hasKey(TSCONFIG_PATHS_ALIAS)
    ) {
      return emptyList();
    }

    String property = context.config().hasKey(TSCONFIG_PATHS)
      ? TSCONFIG_PATHS
      : TSCONFIG_PATHS_ALIAS;
    return Arrays.asList(context.config().getStringArray(property));
  }

  public static List<String> getJsExtensions(Configuration config) {
    return List.of(
      config.hasKey(JavaScriptLanguage.FILE_SUFFIXES_KEY)
        ? config.getStringArray(JavaScriptLanguage.FILE_SUFFIXES_KEY)
        : JavaScriptLanguage.DEFAULT_FILE_SUFFIXES.split(",")
    );
  }

  public static List<String> getTsExtensions(Configuration config) {
    return List.of(
      config.hasKey(TypeScriptLanguage.FILE_SUFFIXES_KEY)
        ? config.getStringArray(TypeScriptLanguage.FILE_SUFFIXES_KEY)
        : TypeScriptLanguage.DEFAULT_FILE_SUFFIXES.split(",")
    );
  }

  public static Set<String> getJsTsExtensions(Configuration config) {
    var extensions = new HashSet<String>();
    extensions.addAll(getJsExtensions(config));
    extensions.addAll(getTsExtensions(config));
    return extensions;
  }

  public static String[] getExcludedPaths(Configuration configuration) {
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

  public static boolean shouldDetectBundles(Configuration config) {
    return config.getBoolean(JavaScriptPlugin.DETECT_BUNDLES_PROPERTY).orElse(true);
  }
}
