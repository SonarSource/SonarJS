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
import org.sonar.plugins.javascript.api.tests.TreeCheckTest;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;


public class UntrustedContentCheckTest extends TreeCheckTest {

  @Test
  public void test() {
    UntrustedContentCheck check = new UntrustedContentCheck();

    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/untrustedContent.js", check))
      .next().atLine(3)
      .next().atLine(5)
      .next().atLine(8)
      .next().atLine(10)
      .next().atLine(13)
      .noMore();
  }

  @Test
  public void testWithParam() {
    UntrustedContentCheck check = new UntrustedContentCheck();
    check.domainsToIgnore = "drevil.org";

    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/untrustedContent.js", check))
      .next().atLine(3)
      .next().atLine(5)
      .next().atLine(8)
      .next().atLine(10)
      .noMore();
  }

  @Test
  public void testWithRegexParam() {
    UntrustedContentCheck check = new UntrustedContentCheck();
    check.domainsToIgnore = "(.*\\.)?drevil.org";

    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/untrustedContent.js", check))
      .next().atLine(3)
      .next().atLine(5)
      .next().atLine(8)
      .next().atLine(10)
      .noMore();
  }

  @Test
  public void testWithRegexParamList() {
    UntrustedContentCheck check = new UntrustedContentCheck();
    check.domainsToIgnore = "(.*\\.)?drevil.org,(.*\\.)?mini.me";

    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/untrustedContent.js", check))
      .next().atLine(3)
      .next().atLine(5)
      .next().atLine(8)
      .next().atLine(10)
      .noMore();
  }
}
