/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.checks;

import com.google.common.base.Charsets;
import java.io.File;
import org.junit.Test;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;

public class FileHeaderCheckTest {

  @Test
  public void test() {
    FileHeaderCheck check = new FileHeaderCheck();
    check.setCharset(Charsets.UTF_8);
    check.headerFormat = "// copyright 2005";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file1.js"))
      .noMore();

    check.headerFormat = "// copyright 20\\d\\d";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file1.js"))
      .next().atLine(null);

    check.headerFormat = "// copyright 2005";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file2.js"))
      .next().atLine(null).withMessage("Add or update the header of this file.");

    check.headerFormat = "// copyright 2012";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file2.js"))
      .noMore();

    check.headerFormat = "// copyright 2012\n// foo";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file2.js"))
      .noMore();

    check.headerFormat = "// copyright 2012\r\n// foo";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file2.js"))
      .noMore();

    check.headerFormat = "// copyright 2012\r// foo";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file2.js"))
      .noMore();

    check.headerFormat = "// copyright 2012\r\r// foo";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file2.js"))
      .next().atLine(null);

    check.headerFormat = "// copyright 2012\n// foo\n\n\n\n\n\n\n\n\n\ngfoo";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file2.js"))
      .next().atLine(null);

    check.headerFormat = "/*foo http://www.example.org*/";

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/FileHeaderCheck/file3.js"))
      .noMore();
  }

}
