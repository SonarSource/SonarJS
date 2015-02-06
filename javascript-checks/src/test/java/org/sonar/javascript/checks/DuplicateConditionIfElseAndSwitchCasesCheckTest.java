/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.junit.Test;
import org.sonar.javascript.checks.utils.TreeCheckTest;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;

public class DuplicateConditionIfElseAndSwitchCasesCheckTest extends TreeCheckTest {

  private DuplicateConditionIfElseAndSwitchCasesCheck check = new DuplicateConditionIfElseAndSwitchCasesCheck();

  @Test
  public void test() {
    SourceFile file = scanFile("src/test/resources/checks/duplicateConditionIfElseAndSwitchCases.js", check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(2).withMessage("This branch duplicates the one on line 1.")
      .next().atLine(7)
      .next().atLine(12)
      .next().atLine(17)
      .next().atLine(23)
      .next().atLine(31)
      .noMore();
  }
}
