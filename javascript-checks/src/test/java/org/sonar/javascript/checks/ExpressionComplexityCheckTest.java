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

public class ExpressionComplexityCheckTest extends TreeCheckTest {

  private ExpressionComplexityCheck check = new ExpressionComplexityCheck();

  @Test
  public void test() {
    SourceFile file = scanFile("src/test/resources/checks/expressionComplexity.js", check);

    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(1).withMessage("Reduce the number of conditional operators (4) used in the expression (maximum allowed " + check.max + ").")
      .next().atLine(3)
      .next().atLine(5)
      .next().atLine(8).withMessage("Reduce the number of conditional operators (6) used in the expression (maximum allowed " + check.max + ").")
      .next().atLine(28)
      .next().atLine(30)
      .next().atLine(38)
      .next().atLine(41)
      .next().atLine(45)
      .noMore();
  }

}
