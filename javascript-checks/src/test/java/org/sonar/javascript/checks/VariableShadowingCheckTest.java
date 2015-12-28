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
package org.sonar.javascript.checks;

import org.junit.Test;
import org.sonar.javascript.checks.tests.TreeCheckTest;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;

public class VariableShadowingCheckTest extends TreeCheckTest {

  @Test
  public void test() {
    VariableShadowingCheck check = new VariableShadowingCheck();

    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/variableShadowing.js", check))
      .next().atLine(2).withMessage("\"x\" hides or potentially hides a variable declared in an outer scope at line 4.")
      .next().atLine(8)
      .next().atLine(11)
      .next().atLine(14)
      .next().atLine(18)
      .next().atLine(19)
      .next().atLine(22)
      .next().atLine(27)
      .next().atLine(28)
      .next().atLine(31)
      .next().atLine(32)
      .next().atLine(37)
      .next().atLine(57).withMessage("\"s\" hides or potentially hides a variable declared in an outer scope at line 60.")
      .noMore();
  }

}
