/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import java.io.File;
import org.junit.Test;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;

public class CommentRegularExpressionCheckTest {

  private final CommentRegularExpressionCheck check = new CommentRegularExpressionCheck();
  private final String dir = "src/test/resources/checks/CommentRegularExpressionCheck";

  @Test
  public void test() {
    check.setRegularExpression("(?i).*TODO.*");
    check.setMessage("Avoid TODO");

    JavaScriptCheckVerifier.verify(check, new File(dir, "commentRegularExpression.js"));
  }

  @Test
  public void no_issue_with_empty_regular_expression() throws Exception {
    check.setRegularExpression("");
    JavaScriptCheckVerifier.verify(check, new File(dir, "commentRegularExpression_no_issue.js"));
  }

  @Test(expected = IllegalArgumentException.class)
  public void bad_regex() {
    check.setRegularExpression("[abc");
    JavaScriptCheckVerifier.verify(check, new File(dir, "commentRegularExpression.js"));
  }

}
