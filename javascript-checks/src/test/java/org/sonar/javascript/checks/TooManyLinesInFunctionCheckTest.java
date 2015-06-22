/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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

public class TooManyLinesInFunctionCheckTest extends TreeCheckTest {

  private final TooManyLinesInFunctionCheck check = new TooManyLinesInFunctionCheck();

  @Test
  public void testDefault() {
    SourceFile file = scanFile("src/test/resources/checks/tooManyLinesInFunction.js", check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .noMore();
  }

  @Test
  public void testCustom() {
    check.max = 3;
    SourceFile file = scanFile("src/test/resources/checks/tooManyLinesInFunction.js", check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(1).withMessage("This function has 6 lines, which is greater than the " + check.max + " lines authorized. Split it into smaller functions.")
      .next().atLine(2).withMessage("This function has 4 lines, which is greater than the " + check.max + " lines authorized. Split it into smaller functions.")
      .next().atLine(8)
      .next().atLine(13)
      .next().atLine(20)
      .next().atLine(30)
      .next().atLine(73)
      .noMore();
  }

}
