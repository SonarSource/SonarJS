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
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;

public class TabCharacterCheckTest {

  TabCharacterCheck check = new TabCharacterCheck();

  @Before
  public void setUp() {
    check.setCharset(Charsets.UTF_8);
  }

  @Test
  public void test() {
    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/tabCharacter.js"))
      .next().atLine(1).withMessage("Replace all tab characters in this file by sequences of white-spaces.")
      .noMore();
  }

  @Test
  public void test2() {
    JavaScriptCheckVerifier.issues(check, new File("src/test/resources/checks/newlineAtEndOfFile.js"))
      .noMore();
  }

}
