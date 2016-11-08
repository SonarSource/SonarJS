/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.checks.utils;

import java.io.File;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.verifier.BulkVerifier;

/**
 * Class to test one single rule on a set of JavaScript files.
 */
public class BulkTestOnSingleRule {
  
  private static final Logger LOGGER = Loggers.get(BulkTestOnSingleRule.class);

  /**
   * Run a specific rule.
   * @param ruleClassName, e.g., "org.sonar.javascript.checks.ComparisonReturningFalseCheck"
   * @param sourceDirectory. If not provided, the ruling directory is used
   */
  public static void main(String[] args) {
    if (args.length == 1) {
      execute(args[0], "../its/sources/src");
    } else if (args.length == 2) {
      execute(args[0], args[1]);
    } else {
      LOGGER.error("First argument = fully-qualified check class name. Second argument (optional) = JS files directory"); 
    }
  }

  private static void execute(String checkClassName, String sourceDirectory) {
    new BulkVerifier().scanDirectory(checkClassName, new File(sourceDirectory));
  }

}
