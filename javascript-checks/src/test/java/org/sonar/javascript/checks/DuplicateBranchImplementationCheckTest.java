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

public class DuplicateBranchImplementationCheckTest extends TreeCheckTest {

  private DuplicateBranchImplementationCheck check = new DuplicateBranchImplementationCheck();

  @Test
  public void test() {
    SourceFile file = scanFile("src/test/resources/checks/duplicateBranchImplementation.js", check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(3).withMessage("This branch's code block is the same as the block for the branch on line 1.")
      .next().atLine(9)
      .next().atLine(17)
      .next().atLine(23)
      .next().atLine(33).withMessage("This case's code block is the same as the block for the case on line 30.")
      .next().atLine(41)
      .next().atLine(54)
      .next().atLine(62)
      .next().atLine(78)
      .next().atLine(98).withMessage("This conditional operation returns the same value whether the condition is \"true\" or \"false\".")
      .next().atLine(101)
      .noMore();
  }
}
