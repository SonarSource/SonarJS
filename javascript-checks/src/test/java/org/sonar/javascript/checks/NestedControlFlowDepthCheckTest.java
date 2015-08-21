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
import org.sonar.plugins.javascript.api.tests.TreeCheckTest;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;

public class NestedControlFlowDepthCheckTest extends TreeCheckTest {

  private NestedControlFlowDepthCheck check = new NestedControlFlowDepthCheck();

  @Test
  public void testDefault() {
    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/nestedControlFlowDepth.js", check))
      .next().atLine(9).withMessage("Refactor this code to not nest more than 3 if/for/while/switch/try statements.")
      .next().atLine(17)
      .next().atLine(20)
      .next().atLine(23)
      .next().atLine(26)
      .next().atLine(29)
      .noMore();
  }

  @Test
  public void testCustomDepth() {
    check.maximumNestingLevel = 4;

    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/nestedControlFlowDepth.js", check))
      .next().atLine(31).withMessage("Refactor this code to not nest more than 4 if/for/while/switch/try statements.")
      .noMore();
  }

}
