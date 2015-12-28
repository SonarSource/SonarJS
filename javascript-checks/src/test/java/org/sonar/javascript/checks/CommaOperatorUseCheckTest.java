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

public class CommaOperatorUseCheckTest extends TreeCheckTest {

  private final CommaOperatorUseCheck check = new CommaOperatorUseCheck();

  @Test
  public void test() {
    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/commaOperatorUse.js", check))
      .next().atLine(1).withMessage("Remove use of this comma operator.")
      .next().atLine(3)
      .next().atLine(6)
      .next().atLine(8)
      .next().atLine(9)
      .next().atLine(13)
      .next().atLine(16)
      .next().atLine(19)
      .next().atLine(21)
      .next().atLine(22)
      .next().atLine(23)
      .next().atLine(25)
      .next().atLine(27)
      .next().atLine(29).withMessage("Remove use of all comma operators in this expression.")
      .next().atLine(33)
      .next().atLine(51)
      .next().atLine(56)
      .next().atLine(56)
      .next().atLine(59)
      .noMore();
  }

}
