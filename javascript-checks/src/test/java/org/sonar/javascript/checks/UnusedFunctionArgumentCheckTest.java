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

import com.sonar.sslr.squid.checks.CheckMessagesVerifier;
import org.junit.Test;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.squid.api.SourceFile;

import java.io.File;

public class UnusedFunctionArgumentCheckTest {

  @Test
  public void test() {
    UnusedFunctionArgumentCheck check = new UnusedFunctionArgumentCheck();

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/unusedFunctionArgument.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(1).withMessage("Remove the declaration of the unused 'b' argument.")
      .next().atLine(5).withMessage("Remove the declaration of the unused 'b' argument.")
      .next().atLine(5).withMessage("Remove the declaration of the unused 'c' argument.")
      .next().atLine(9).withMessage("Remove the declaration of the unused 'a' argument.")
      .next().atLine(12).withMessage("Remove the declaration of the unused 'c' argument.")
      .next().atLine(24)
      .next().atLine(28)
      .noMore();
  }

}
