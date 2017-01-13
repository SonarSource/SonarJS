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

import java.io.File;
import org.junit.Test;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;

import static org.assertj.core.api.Assertions.assertThat;

public class CommentRegularExpressionCheckTest {

  @Test
  public void test() {
    CommentRegularExpressionCheck check = new CommentRegularExpressionCheck();

    check.setRegularExpression("(?i).*TODO.*");
    check.setMessage("Avoid TODO");

    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/commentRegularExpression.js"))
      .next().atLine(2).withMessage("Avoid TODO")
      .noMore();

    check.setRegularExpression("");
    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/commentRegularExpression.js"))
      .noMore();

    try {
      check.setRegularExpression("[abc");
    } catch (IllegalStateException e) {
      assertThat(e.getMessage()).isEqualTo("Unable to compile regular expression: [abc");
    }
  }

}
