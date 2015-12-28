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

import org.junit.Test;
import org.sonar.javascript.checks.tests.TreeCheckTest;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;

public class PostMessageCheckTest extends TreeCheckTest {

  @Test
  public void test() {
    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/PostMessage.js", new PostMessageCheck()))
      .next().atLine(2).withMessage("Make sure this cross-domain message is being sent to the intended domain.")
      .next().atLine(5)
      .next().atLine(8)
      .next().atLine(10)
      .next().atLine(11)
      .next().atLine(14)
      .noMore();
  }

}
