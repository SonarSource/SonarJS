/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

public class FileHeaderCheckTest {

  private final File file1 = new File("src/test/resources/checks/FileHeaderCheck/file1.js");
  private final File file2 = new File("src/test/resources/checks/FileHeaderCheck/file2.js");

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  @Test
  public void test_plain() {
    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2005"), file1)
      .noMore();

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 20\\d\\d"), file1)
      .next().atLine(null);

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2005"), file2)
      .next().atLine(null).withMessage("Add or update the header of this file.");

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2012"), file2)
      .noMore();

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2012\n// foo"), file2)
      .noMore();

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2012\r\n// foo"), file2)
      .noMore();

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2012\r// foo"), file2)
      .noMore();

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2012\r\r// foo"), file2)
      .next().atLine(null);

    JavaScriptCheckVerifier.issues(checkPlainText("// copyright 2012\n// foo\n\n\n\n\n\n\n\n\n\ngfoo"), file2)
      .next().atLine(null);

    JavaScriptCheckVerifier.issues(checkPlainText("/*foo http://www.example.org*/"), new File("src/test/resources/checks/FileHeaderCheck/file3.js"))
      .noMore();
  }

  @Test
  public void test_regular_expression() {
    JavaScriptCheckVerifier.issues(checkWithRegex("// copyright 2005"), file1)
      .noMore();

    JavaScriptCheckVerifier.issues(checkWithRegex("// copyright 20\\d\\d"), file1)
      .noMore();

    JavaScriptCheckVerifier.issues(checkWithRegex("// copyright 20\\d\\d"), file2)
      .noMore();

    JavaScriptCheckVerifier.issues(checkWithRegex("// copyright 20\\d\\d\\n// foo"), file2)
      .noMore();

    JavaScriptCheckVerifier.issues(checkWithRegex("// copyright 20\\d{3}\\n// foo"), file2)
      .next().atLine(null);

    JavaScriptCheckVerifier.issues(checkWithRegex("// copyright 20\\d{2}\\r?\\n// foo"), file2)
      .noMore();

    JavaScriptCheckVerifier.issues(checkWithRegex("// copyright 20\\d\\d\\r// foo"), file2)
      .next().atLine(null);
  }

  @Test
  public void should_fail_with_bad_regular_expression() {
    thrown.expect(IllegalArgumentException.class);
    thrown.expectMessage("[" + FileHeaderCheck.class.getSimpleName() + "] Unable to compile the regular expression: *");

    FileHeaderCheck check = new FileHeaderCheck();
    check.headerFormat = "*";
    check.isRegularExpression = true;
    JavaScriptCheckVerifier.issues(checkWithRegex("*"), file1);
  }

  private static JavaScriptCheck checkWithRegex(String pattern) {
    FileHeaderCheck check = new FileHeaderCheck();
    check.isRegularExpression = true;
    check.setCharset(Charsets.UTF_8);
    check.headerFormat = pattern;
    return check;
  }

  private static JavaScriptCheck checkPlainText(String format) {
    FileHeaderCheck check = new FileHeaderCheck();
    check.isRegularExpression = false;
    check.setCharset(Charsets.UTF_8);
    check.headerFormat = format;
    return check;
  }
}
