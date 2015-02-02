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

public class BoundOrAssignedEvalOrArgumentsCheckTest {

  @Test
  public void test() {
    BoundOrAssignedEvalOrArgumentsCheck check = new BoundOrAssignedEvalOrArgumentsCheck();

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/boundOrAssignedEvalOrArguments.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(1).withMessage("Remove the modification of \"eval\".")
        .next().atLine(2).withMessage("Remove the modification of \"arguments\".")
        .next().atLine(3).withMessage("Remove the modification of \"eval\".")
        .next().atLine(4).withMessage("Do not use \"arguments\" to declare a parameter - use another name.")
        .next().atLine(6).withMessage("Do not use \"eval\" to declare a variable - use another name.")
        .next().atLine(7).withMessage("Do not use \"arguments\" to declare a variable - use another name.")
        .next().atLine(8).withMessage("Do not use \"eval\" to declare a parameter - use another name.")
        .next().atLine(9).withMessage("Do not use \"arguments\" to declare a function - use another name.")
        .next().atLine(10).withMessage("Do not use \"eval\" to declare a function - use another name.")
        // FIXME not able to detect:
        // .next().atLine(10)
        .next().atLine(22).withMessage("Remove the modification of \"arguments\".")
        .next().atLine(25).withMessage("Do not use \"eval\" to declare a parameter - use another name.")
        .next().atLine(28).withMessage("Do not use \"arguments\" to declare a parameter - use another name.")
        .next().atLine(31).withMessage("Do not use \"eval\" to declare a parameter - use another name.")
        .next().atLine(43).withMessage("Do not use \"eval\" to declare a parameter - use another name.")
        .next().atLine(44).withMessage("Do not use \"arguments\" to declare a variable - use another name.")
        .next().atLine(50)
        .next().atLine(56)
        .next().atLine(57)
        .noMore();
  }

}
