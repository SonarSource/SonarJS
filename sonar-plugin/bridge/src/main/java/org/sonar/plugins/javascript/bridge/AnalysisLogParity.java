/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.bridge;

public final class AnalysisLogParity {

  public static final String TYPE_CHECKING_DISABLED_LOG =
    "Type checking is disabled (sonar.javascript.disableTypeChecking=true). All files will be analyzed without type information.";

  private AnalysisLogParity() {}

  public static boolean isTypeCheckingDisabledLog(String line) {
    return TYPE_CHECKING_DISABLED_LOG.equals(line);
  }
}
