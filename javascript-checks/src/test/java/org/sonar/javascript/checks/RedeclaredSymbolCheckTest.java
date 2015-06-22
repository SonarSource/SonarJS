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

public class RedeclaredSymbolCheckTest extends TreeCheckTest {

  private RedeclaredSymbolCheck check = new RedeclaredSymbolCheck();

  @Test
  public void test() {
    SourceFile file = scanFile("src/test/resources/checks/redeclaredSymbol.js", check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
    .next().atLine(3).withMessage("Rename \"fun\" as this name is already used in declaration at line 1.")
    .next().atLine(10).withMessage("Rename \"inner\" as this name is already used in declaration at line 8.")
    .next().atLine(13).withMessage("Rename \"f\" as this name is already used in declaration at line 5.")

    .next().atLine(18).withMessage("Rename \"a\" as this name is already used in declaration at line 17.")
    .next().atLine(22).withMessage("Rename \"a\" as this name is already used in declaration at line 21.")
    .next().atLine(27).withMessage("Rename \"i\" as this name is already used in declaration at line 26.")
    .next().atLine(34).withMessage("Rename \"b\" as this name is already used in declaration at line 32.")
    .next().atLine(38).withMessage("Rename \"a\" as this name is already used in declaration at line 37.")
    .next().atLine(42)
    .next().atLine(43)
    .next().atLine(48)
    .next().atLine(52)
    .next().atLine(58)

    .next().atLine(73)
    .next().atLine(78)
    .next().atLine(81)
    .next().atLine(85)
    .next().atLine(90)
    .next().atLine(97)
    .next().atLine(101)
    .next().atLine(105)
    .next().atLine(106)
    .noMore();

  }
}
