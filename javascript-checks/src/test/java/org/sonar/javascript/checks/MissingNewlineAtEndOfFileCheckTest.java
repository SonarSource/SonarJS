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

public class MissingNewlineAtEndOfFileCheckTest {

  private static final String DIRECTORY = "src/test/resources/checks/MissingNewlineAtEndOfFileCheck";
  private static final MissingNewlineAtEndOfFileCheck check = new MissingNewlineAtEndOfFileCheck();

  @Test
  public void nok() {
    JavaScriptCheckVerifier.issues(check, new File(DIRECTORY, "newlineAtEndOfFile_nok.js"))
      .next()
      .noMore();
  }

  @Test
  public void ok() {
    JavaScriptCheckVerifier.issues(check, new File(DIRECTORY, "newlineAtEndOfFile_ok.js"))
      .noMore();
  }

  @Test
  public void empty_lines() {
    JavaScriptCheckVerifier.issues(check, new File(DIRECTORY, "empty_lines.js"))
      .noMore();
  }

  @Test
  public void empty() {
    JavaScriptCheckVerifier.issues(check, new File(DIRECTORY, "empty.js"))
      .noMore();
  }

}
