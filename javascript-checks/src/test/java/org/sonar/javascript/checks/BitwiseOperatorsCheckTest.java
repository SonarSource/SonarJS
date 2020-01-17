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

public class BitwiseOperatorsCheckTest {

  private static File DIR = new File("src/test/resources/checks/BitwiseOperatorsCheck");
  private BitwiseOperatorsCheck check = new BitwiseOperatorsCheck();

  @Test
  public void test_ok() {
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok_with_bitwise_operator.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok_outside_condition.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok_with_literal.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok_several_suspicious.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok_for_init.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok_for_no_condition.js"));
  }

  @Test
  public void test_nok() {
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok_if.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok_while.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok_ternary.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok_do_while.js"));
  }
}
