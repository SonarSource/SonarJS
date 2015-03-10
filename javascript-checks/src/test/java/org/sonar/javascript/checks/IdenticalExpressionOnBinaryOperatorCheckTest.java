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

public class IdenticalExpressionOnBinaryOperatorCheckTest extends TreeCheckTest {

  private IdenticalExpressionOnBinaryOperatorCheck check = new IdenticalExpressionOnBinaryOperatorCheck();

  @Test
  public void test() {
    SourceFile file = scanFile("src/test/resources/checks/identicalExpressionOnBinaryOperator.js", check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(4).withMessage("Identical sub-expressions on both sides of operator \"==\"")
      .next().atLine(6).withMessage("Identical sub-expressions on both sides of operator \"!=\"")
      .next().atLine(8).withMessage("Identical sub-expressions on both sides of operator \"===\"")
      .next().atLine(10).withMessage("Identical sub-expressions on both sides of operator \"&&\"")
      .next().atLine(12).withMessage("Identical sub-expressions on both sides of operator \"||\"")
      .next().atLine(14).withMessage("Identical sub-expressions on both sides of operator \"/\"")
      .next().atLine(16).withMessage("Identical sub-expressions on both sides of operator \"-\"")
      .next().atLine(18).withMessage("Identical sub-expressions on both sides of operator \"<<\"")
      .noMore();
  }
}
