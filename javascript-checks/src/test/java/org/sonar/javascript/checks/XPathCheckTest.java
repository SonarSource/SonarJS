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

public class XPathCheckTest {

  private XPathCheck check = new XPathCheck();

  @Test
  public void check() {
    check.xpathQuery = "//IDENTIFIER[string-length(@tokenValue) >= 10]";
    check.message = "Avoid identifiers which are too long!";

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/xpath.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .next().atLine(2).withMessage("Avoid identifiers which are too long!")
        .noMore();
  }

  @Test
  public void parseError() {
    check.xpathQuery = "//IDENTIFIER";

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/parsingError.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
        .noMore();
  }

}
