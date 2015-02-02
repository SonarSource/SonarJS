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

import org.junit.Ignore;
import org.sonar.javascript.checks.utils.TreeCheckTest;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;
import org.junit.Test;
import org.sonar.squidbridge.api.SourceFile;

@Ignore("SONARJS-309 Fix and re-introduce the rule")
public class AssignmentWithinConditionCheckTest extends TreeCheckTest {

  @Test
  public void test() {
    AssignmentWithinConditionCheck check = new AssignmentWithinConditionCheck();

    SourceFile file = scanFile("src/test/resources/checks/assignmentWithinCondition.js", check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(1).withMessage("Extract the assignment out of this expression.")
        .next().atLine(4)
        .next().atLine(16)
        .next().atLine(23)
        .next().atLine(28)
        .next().atLine(47)
        .next().atLine(56)
        .next().atLine(60)
        .noMore();
  }

}
