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
import org.junit.Rule;
import org.junit.Test;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;
import org.sonar.squidbridge.checks.CheckMessagesVerifierRule;

public class ForLoopIncrementSignCheckTest {

  @Rule
  public CheckMessagesVerifierRule checkMessagesVerifier = new CheckMessagesVerifierRule();

  @Test
  public void test() {
    JavaScriptCheckVerifier.issues(new ForLoopIncrementSignCheck(), new File("src/test/resources/checks/forLoopIncrementSign.js"))
      .next().atLine(4).withMessage("\"i\" is incremented and will never reach \"stop condition\".")
      .next().atLine(5)
      .next().atLine(7).withMessage("\"i\" is decremented and will never reach \"stop condition\".")
      .next().atLine(8)
      .next().atLine(10)
      .next().atLine(11)
      .next().atLine(13)
      .next().atLine(14)
      .next().atLine(18)
      .next().atLine(23);
  }

}
