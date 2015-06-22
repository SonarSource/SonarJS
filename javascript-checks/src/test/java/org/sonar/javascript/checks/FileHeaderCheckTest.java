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

public class FileHeaderCheckTest {

  @Test
  public void test() {
    FileHeaderCheck check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2005";

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file1.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .noMore();

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 20\\d\\d";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file1.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(null);

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2005";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file2.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(null).withMessage("Add or update the header of this file.");

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2012";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file2.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .noMore();

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2012\n// foo";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file2.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .noMore();

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2012\r\n// foo";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file2.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .noMore();

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2012\r// foo";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file2.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .noMore();

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2012\r\r// foo";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file2.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(null);

    check = new FileHeaderCheck();
    check.headerFormat = "// copyright 2012\n// foo\n\n\n\n\n\n\n\n\n\ngfoo";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file2.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(null);

    check = new FileHeaderCheck();
    check.headerFormat = "/*foo http://www.example.org*/";

    file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/FileHeaderCheck/file3.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .noMore();
  }

}
