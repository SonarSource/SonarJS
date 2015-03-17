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

import org.junit.Rule;
import org.junit.Test;
import org.sonar.javascript.checks.utils.TreeCheckTest;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.squidbridge.checks.CheckMessagesVerifierRule;

public class ForLoopConditionAndUpdateCheckTest extends TreeCheckTest {

  @Rule
  public CheckMessagesVerifierRule checkMessagesVerifier = new CheckMessagesVerifierRule();

  @Test
  public void test() {
    SourceFile file = scanFile("src/test/resources/checks/forLoopConditionAndUpdate.js", new ForLoopConditionAndUpdateCheck());
    checkMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(3).withMessage("This loop's stop condition tests \"i\" but the incrementer updates \"j\".")
      .next().atLine(5).withMessage("This loop's stop condition tests \"i\" but the incrementer updates \"j\".")
      .next().atLine(7).withMessage("This loop's stop condition tests \"i, j\" but the incrementer updates \"k\".")
      .next().atLine(10).withMessage("This loop's stop condition tests \"condition\" but the incrementer updates \"i\".")
      .next().atLine(13).withMessage("This loop's stop condition tests \"x\" but the incrementer updates \"z\".")
      .next().atLine(15).withMessage("This loop's stop condition tests \"this.i\" but the incrementer updates \"this.j\".")
      .next().atLine(16).withMessage("This loop's stop condition tests \"i\" but the incrementer updates \"j\".");
  }
  
}
