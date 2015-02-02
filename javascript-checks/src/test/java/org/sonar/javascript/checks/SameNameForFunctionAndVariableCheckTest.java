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
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;

import java.io.File;

public class SameNameForFunctionAndVariableCheckTest {

  @Test
  public void test() {
    SameNameForFunctionAndVariableCheck check = new SameNameForFunctionAndVariableCheck();

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/sameNameForFunctionAndVariable.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(2).withMessage("Refactor the code to avoid using \"fun1\" for both a variable and a function.")
      .next().atLine(7).withMessage("Refactor the code to avoid using \"fun2\" for both a variable and a function.")
      .next().atLine(10)
      .next().atLine(14).withMessage("Refactor the code to avoid using \"foo1\" for both a variable and a function.")
      .next().atLine(19).withMessage("Refactor the code to avoid using \"foo2\" for both a variable and a function.")
      .next().atLine(22)
      .next().atLine(26).withMessage("Refactor the code to avoid using \"fun4\" for both a variable and a function.")
      .next().atLine(30).withMessage("Refactor the code to avoid using \"fun5\" for both a variable and a function.")
      .next().atLine(34)
      .noMore();
  }

}
