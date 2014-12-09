/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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

import org.sonar.squidbridge.checks.CheckMessagesVerifier;
import org.junit.Test;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.squidbridge.api.SourceFile;

import java.io.File;

@Rule(
  key = "S134",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class NestedControlFlowDepthCheckTest {

  private NestedControlFlowDepthCheck check = new NestedControlFlowDepthCheck();

  @Test
  public void testDefault() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/nestedControlFlowDepth.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(9).withMessage("Refactor this code to not nest more than 3 if/for/while/switch/try statements.")
      .next().atLine(17)
      .next().atLine(20)
      .next().atLine(23)
      .next().atLine(26)
      .next().atLine(29)
      .noMore();
  }

  @Test
  public void testCustomDepth() {
    check.maximumNestingLevel = 4;

    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/checks/nestedControlFlowDepth.js"), check);
    CheckMessagesVerifier.verify(file.getCheckMessages())
      .next().atLine(31).withMessage("Refactor this code to not nest more than 4 if/for/while/switch/try statements.")
      .noMore();
  }

}
