/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

public class NewOperatorMisuseCheckTest {

  private NewOperatorMisuseCheck check = new NewOperatorMisuseCheck();

  @Test
  public void default_without_jsdoc() {
    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/newOperatorMisuse.js"))
      .next().atLine(36)
      .next().atLine(38)
      .next().atLine(39)
      .next().atLine(44)
      .next().atLine(45)
      .noMore();
  }

  @Test
  public void custom_with_jsdoc() {
    check.considerJSDoc = true;
    JavaScriptCheckVerifier.verify(check, new File("src/test/resources/checks/newOperatorMisuse.js"));
  }
}
