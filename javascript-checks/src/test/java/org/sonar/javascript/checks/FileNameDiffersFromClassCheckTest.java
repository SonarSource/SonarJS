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

import java.io.File;
import org.junit.Test;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;

public class FileNameDiffersFromClassCheckTest {

  private final FileNameDiffersFromClassCheck check = new FileNameDiffersFromClassCheck();
  private final String directory = "src/test/resources/checks/FileNameDiffersFromClassCheck/";

  @Test
  public void ok() {
    JavaScriptCheckVerifier.issues(check, new File(directory + "MyClass.js")).noMore();
  }

  @Test
  public void ok_several_exports() {
    JavaScriptCheckVerifier.issues(check, new File(directory + "ok_several_exports.js")).noMore();
  }

  @Test
  public void ok_anonymous_class() {
    JavaScriptCheckVerifier.issues(check, new File(directory + "ok_anonymous_class.js")).noMore();
  }

  @Test
  public void ok_function_export() {
    JavaScriptCheckVerifier.issues(check, new File(directory + "ok_function_export.js")).noMore();
  }

  @Test
  public void nok_identifier() {
    JavaScriptCheckVerifier.issues(check, new File(directory + "nok_identifier.js"))
      .next().withMessage("Rename this file to \"MyClass\".")
      .noMore();
  }

  @Test
  public void nok_class_declaration() {
    JavaScriptCheckVerifier.issues(check, new File(directory + "nok_class_declaration.js"))
      .next().withMessage("Rename this file to \"MyClass\".")
      .noMore();
  }

}
