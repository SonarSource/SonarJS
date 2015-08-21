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

public class DeprecatedJQueryAPICheckTest extends TreeCheckTest {

  @Test
  public void test() {
    DeprecatedJQueryAPICheck check = new DeprecatedJQueryAPICheck();

    CheckMessagesVerifier.verify(getIssues("src/test/resources/checks/DeprecatedJQueryAPI.js", check))
        .next().atLine(1).withMessage("Remove this use of \"boxModel\", which is deprecated.")
        .next().atLine(3).withMessage("Remove this use of \"sub()\", which is deprecated.")
        .next().atLine(5).withMessage("Remove this use of \"context\", which is deprecated.")
        .next().atLine(7).withMessage("Remove this use of \"andSelf()\", which is deprecated.")
        //  todo (Lena) type-inference models is not capable to recognize chained selectors
//        .next().atLine(9).withMessage("Remove this use of \"andSelf()\", which is deprecated.")
//        .next().atLine(11).withMessage("Remove this use of \"context\", which is deprecated.")
//        .next().atLine(17).withMessage("Remove this use of \"andSelf()\", which is deprecated.")
        .noMore();
  }


}
