/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

public class ArrowFunctionConventionCheckTest {

  private final ArrowFunctionConventionCheck check = new ArrowFunctionConventionCheck();
  private final File file = new File("src/test/resources/checks/ArrowFunctionConvention.js");

  @Test
  public void test_default() {
    JavaScriptCheckVerifier.verify(check, file);
  }

  @Test
  public void test_always_parentheses() throws Exception {
    check.setParameterParens(true);

    JavaScriptCheckVerifier.issues(check, file)
      .next().atLine(7).withMessage("Add parentheses around the parameter of this arrow function.")
      .next().atLine(14).withMessage("Remove curly braces and \"return\" from this arrow function body.")
      .noMore();
  }

  @Test
  public void test_always_curly_braces() throws Exception {
    check.setBodyBraces(true);

    JavaScriptCheckVerifier.issues(check, file)
      .next().atLine(5).withMessage("Remove parentheses around the parameter of this arrow function.")
      .next().atLine(16).withMessage("Add curly braces and \"return\" to this arrow function body.")
      .next().atLine(17)
      .next().atLine(18)
      .noMore();
  }
}
