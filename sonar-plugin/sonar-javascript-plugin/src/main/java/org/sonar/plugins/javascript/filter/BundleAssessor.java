/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.filter;

import static java.util.regex.Pattern.DOTALL;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.regex.Pattern;
import org.apache.commons.io.IOUtils;
import org.apache.commons.io.input.BoundedReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;

public class BundleAssessor implements Assessor {

  private static final Logger LOG = LoggerFactory.getLogger(BundleAssessor.class);
  static final String PROPERTY = "sonar.javascript.detectBundles";
  private static final Pattern COMMENT_OPERATOR_FUNCTION = bundleRegexPattern();
  private static final int READ_CHARACTERS_LIMIT = 2048;
  private boolean isInfoLogged;

  @Override
  public boolean test(InputFile inputFile) {
    try (
      var reader = new BoundedReader(
        new InputStreamReader(inputFile.inputStream(), inputFile.charset()),
        READ_CHARACTERS_LIMIT
      )
    ) {
      var content = IOUtils.toString(reader);
      var matcher = COMMENT_OPERATOR_FUNCTION.matcher(content);
      if (matcher.find()) {
        LOG.debug(
          "File {} was excluded because it looks like a bundle. (Disable detection with " +
          PROPERTY +
          "=false)",
          inputFile
        );
        if (!isInfoLogged) {
          LOG.info(
            "Some of the project files were automatically excluded because they looked like generated code. " +
            "Enable debug logging to see which files were excluded. You can disable bundle detection by setting " +
            BundleAssessor.PROPERTY +
            "=false"
          );
          isInfoLogged = true;
        }
        return true;
      }
    } catch (IOException e) {
      return true;
    }
    return false;
  }

  private static Pattern bundleRegexPattern() {
    var comment = "/\\*.*\\*/";
    var operator = "[!;+(]";
    var optionalFunctionName = "(?: [_$a-zA-Z][_$a-zA-Z0-9]*)?";
    return Pattern.compile(
      comment + "\\s*" + operator + "function ?" + optionalFunctionName + "\\(",
      DOTALL
    );
  }
}
