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

import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

@Rule(
  key = "UnreachableCode",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class UnreachableCodeCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.BREAK_STATEMENT,
        EcmaScriptGrammar.RETURN_STATEMENT,
        Kind.CONTINUE_STATEMENT,
        EcmaScriptGrammar.THROW_STATEMENT);
  }

  @Override
  public void visitNode(AstNode node) {
    while (node.getParent().is(EcmaScriptGrammar.STATEMENT)) {
      node = node.getParent();
    }

    AstNode nextStatement = node.getNextSibling();
    if (isUnReachableCode(nextStatement)) {
      getContext().createLineViolation(this, "This statement can't be reached and so start a dead code block.", nextStatement);
    }
  }

  public static boolean isUnReachableCode(AstNode node) {
    return node != null
      && !node.is(EcmaScriptGrammar.ELSE_CLAUSE)
      && !node.is(EcmaScriptGrammar.DECLARATION);
  }

}
