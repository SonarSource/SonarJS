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

import org.sonar.squidbridge.checks.CheckMessagesVerifier;
import org.junit.Test;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.squidbridge.api.SourceFile;

import java.io.File;

public class FunctionComplexityCheckTest {

  @Test
  public void test() {
    FunctionComplexityCheck check = new FunctionComplexityCheck();
    check.setMaximumFunctionComplexityThreshold(2);

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/functionComplexity.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(1).withMessage("Function has a complexity of 5 which is greater than 2 authorized.")
        .next().atLine(14)
        .noMore();
  }

}
