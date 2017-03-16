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

public class BitwiseOperatorsCheckTest {

  private static File DIR = new File("src/test/resources/checks/BitwiseOperatorsCheck");
  private BitwiseOperatorsCheck check = new BitwiseOperatorsCheck();

  @Test
  public void test_ok() {
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok1.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok2.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok3.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok4.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok5.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_ok6.js"));
  }

  @Test
  public void test_nok() {
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok1.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok2.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok3.js"));
    JavaScriptCheckVerifier.verify(check, new File(DIR, "file_nok4.js"));
  }
}
