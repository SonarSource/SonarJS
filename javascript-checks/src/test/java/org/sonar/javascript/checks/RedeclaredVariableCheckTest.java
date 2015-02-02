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

public class RedeclaredVariableCheckTest {

  @Test
  public void test() {
    RedeclaredVariableCheck check = new RedeclaredVariableCheck();

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/redeclaredVariable.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(3).withMessage("Rename variable \"a\" as this name is already used.")
        .next().atLine(7).withMessage("Rename variable \"a\" as this name is already used.")
        .next().atLine(12).withMessage("Rename variable \"i\" as this name is already used.")
        .next().atLine(19).withMessage("Rename variable \"b\" as this name is already used.")
        .next().atLine(23).withMessage("Rename variable \"a\" as this name is already used.")
        .next().atLine(27).withMessage("Rename variable \"a\" as this name is already used.")
        .next().atLine(28).withMessage("Rename variable \"c\" as this name is already used.")
        .next().atLine(33).withMessage("Rename variable \"b\" as this name is already used.")
        .next().atLine(38).withMessage("Rename variable \"a\" as this name is already used.")
        .next().atLine(42).withMessage("Rename variable \"a\" as this name is already used.")
        .next().atLine(46).withMessage("Rename variable \"a\" as this name is already used.")
        .next().atLine(52).withMessage("Rename variable \"a\" as this name is already used.")
        .noMore();
  }

}
