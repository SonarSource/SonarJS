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

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Scanner;
import java.util.Set;
import java.util.regex.Pattern;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;

public class JavaScriptFilePredicate {

  // Helm template directives - for YAML files
  private static final String DIRECTIVE_IN_COMMENT = "#.*\\{\\{";
  private static final String DIRECTIVE_IN_SINGLE_QUOTE = "'[^']*\\{\\{[^']*'";
  private static final String DIRECTIVE_IN_DOUBLE_QUOTE = "\"[^\"]*\\{\\{[^\"]*\"";
  private static final String CODEFRESH_VARIABLES = "\\{\\{[\\w\\s]+}}";
  private static final Pattern HELM_DIRECTIVE_IN_COMMENT_OR_STRING = Pattern.compile(
    "(" +
      String.join(
        "|",
        DIRECTIVE_IN_COMMENT,
        DIRECTIVE_IN_SINGLE_QUOTE,
        DIRECTIVE_IN_DOUBLE_QUOTE,
        CODEFRESH_VARIABLES
      ) +
      ")"
  );

  public static final String SAM_TRANSFORM_FIELD = "AWS::Serverless-2016-10-31";
  public static final String NODEJS_RUNTIME_REGEX = "^\\s*Runtime:\\s*[\'\"]?nodejs\\S*[\'\"]?";
  public static final String YAML_LANGUAGE = "yaml";
  public static final String WEB_LANGUAGE = "web";

  private JavaScriptFilePredicate() {}

  /**
   * YAML predicate with Helm-safe filtering and SAM template detection.
   *
   * <p>Helm templates use {@code {{ ... }}}. We treat any such token appearing outside
   * comments or quoted strings as "unsafe" and exclude the file, because it may
   * no longer be valid YAML after templating.</p>
   *
   * <p>We only accept files that also contain the SAM transform marker and a
   * Node.js runtime declaration, matching the previous YamlSensor behavior.</p>
   */
  public static FilePredicate getYamlPredicate(List<String> yamlExtensions) {
    var yamlExtensionPredicate = getSuffixPredicate(yamlExtensions);
    return inputFile -> yamlExtensionPredicate.apply(inputFile) && hasValidYamlContent(inputFile);
  }

  public static FilePredicate getJsTsPredicate(FileSystem fs) {
    return fs.predicates().hasLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY);
  }

  public static FilePredicate getSuffixPredicate(List<String> suffixes) {
    Set<String> normalizedSuffixes = normalizeSuffixes(suffixes);
    if (normalizedSuffixes.isEmpty()) {
      return inputFile -> false;
    }
    return inputFile -> normalizedSuffixes.contains(getLowerCaseExtension(inputFile.filename()));
  }

  private static Set<String> normalizeSuffixes(List<String> suffixes) {
    if (suffixes == null || suffixes.isEmpty()) {
      return Set.of();
    }
    Set<String> normalizedSuffixes = new HashSet<>();
    for (String suffix : suffixes) {
      if (suffix == null) {
        continue;
      }
      String normalizedSuffix = suffix.trim().toLowerCase(Locale.ROOT);
      if (normalizedSuffix.isBlank()) {
        continue;
      }
      normalizedSuffixes.add(
        normalizedSuffix.startsWith(".") ? normalizedSuffix : "." + normalizedSuffix
      );
    }
    return normalizedSuffixes;
  }

  private static String getLowerCaseExtension(String fileName) {
    int extensionStart = fileName.lastIndexOf('.');
    if (extensionStart < 0) {
      return "";
    }
    return fileName.substring(extensionStart).toLowerCase(Locale.ROOT);
  }

  private static boolean hasValidYamlContent(InputFile inputFile) {
    try (Scanner scanner = new Scanner(inputFile.inputStream(), inputFile.charset().name())) {
      Pattern regex = Pattern.compile(NODEJS_RUNTIME_REGEX);
      boolean hasAwsTransform = false;
      boolean hasNodeJsRuntime = false;
      while (scanner.hasNextLine()) {
        String line = scanner.nextLine();
        if (line.contains("{{") && !HELM_DIRECTIVE_IN_COMMENT_OR_STRING.matcher(line).find()) {
          return false;
        }
        if (!hasAwsTransform && line.contains(SAM_TRANSFORM_FIELD)) {
          hasAwsTransform = true;
        }
        if (!hasNodeJsRuntime && regex.matcher(line).find()) {
          hasNodeJsRuntime = true;
        }
      }
      return hasAwsTransform && hasNodeJsRuntime;
    } catch (IOException e) {
      throw new IllegalStateException(
        String.format("Unable to read file: %s. %s", inputFile.uri(), e.getMessage()),
        e
      );
    }
  }
}
