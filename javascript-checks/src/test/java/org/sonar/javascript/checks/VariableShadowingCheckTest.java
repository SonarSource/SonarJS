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

public class VariableShadowingCheckTest {

  @Test
  public void test() {
    VariableShadowingCheck check = new VariableShadowingCheck();

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/variableShadowing.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(2).withMessage("\"x\" hides variable declared in outer scope.")
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
        .noMore();
  }

}
