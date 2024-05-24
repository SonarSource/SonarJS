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

import java.io.IOException;
import java.util.Locale;
import java.util.Scanner;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.analysis.YamlSensor;

public class JavaScriptFilePredicate {

  private static final String regex = "\\<script[^>]+lang=['\"]ts['\"][^>]*>";
  private static final Pattern pattern = Pattern.compile(regex);
  private static final Predicate<String> predicate = pattern.asPredicate();
  private static final FilePredicate hasScriptTagWithLangTS = file -> {
    try {
      return predicate.test(file.contents());
    } catch (IOException e) {
      return false;
    }
  };

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

  private JavaScriptFilePredicate() {}

  public static FilePredicate getYamlPredicate(FileSystem fs) {
    return fs
      .predicates()
      .and(
        fs.predicates().hasLanguage(YamlSensor.LANGUAGE),
        inputFile -> {
          try (Scanner scanner = new Scanner(inputFile.inputStream(), inputFile.charset().name())) {
            while (scanner.hasNextLine()) {
              String line = scanner.nextLine();
              if (
                line.contains("{{") && !HELM_DIRECTIVE_IN_COMMENT_OR_STRING.matcher(line).find()
              ) {
                return false;
              }
            }
            return true;
          } catch (IOException e) {
            throw new IllegalStateException(
              String.format("Unable to read file: %s. %s", inputFile.uri(), e.getMessage()),
              e
            );
          }
        }
      );
  }

  public static FilePredicate getJsTsPredicate(FileSystem fs) {
    return fs.predicates().hasLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY);
  }

  private static boolean isVueTsFile(InputFile file) {
    return (
      file.filename().toLowerCase(Locale.ROOT).endsWith(".vue") &&
      hasScriptTagWithLangTS.apply(file)
    );
  }

  public static boolean isTypeScriptFile(InputFile file) {
    return (TypeScriptLanguage.KEY.equals(file.language()) || isVueTsFile(file));
  }
}
