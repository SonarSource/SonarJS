/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.junit.Test;
import org.sonar.plugins.javascript.api.tests.TreeCheckTest;
import org.sonar.squidbridge.checks.CheckMessagesVerifier;

public class ExcessiveParameterListCheckTest extends TreeCheckTest {

  private ExcessiveParameterListCheck check = new ExcessiveParameterListCheck();

  @Test
  public void defaults() {
    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/excessiveParameterList.js", check))
        .next().atLine(4).withMessage("Function has 8 parameters which is greater than 7 authorized.")
        .next().atLine(7)
        .noMore();
  }

  @Test
  public void test() {
    check.setMaximumFunctionParameters(8);
    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/excessiveParameterList.js", check))
        .noMore();
  }

}
