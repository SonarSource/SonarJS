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
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.List;

@Rule(
  key = "CurlyBraces",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class AlwaysUseCurlyBracesCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.IF_STATEMENT,
        EcmaScriptGrammar.FOR_IN_STATEMENT,
        EcmaScriptGrammar.FOR_STATEMENT,
        EcmaScriptGrammar.WHILE_STATEMENT,
        EcmaScriptGrammar.DO_WHILE_STATEMENT,
        EcmaScriptGrammar.ELSE_CLAUSE);
  }

  @Override
  public void visitNode(AstNode astNode) {
    List<AstNode> statements = astNode.getChildren(EcmaScriptGrammar.STATEMENT);
    for (AstNode statement : statements) {
      if (statement.getChild(0).is(EcmaScriptGrammar.IF_STATEMENT)
          && statement.getPreviousSibling().is(EcmaScriptKeyword.ELSE)) {
        continue;
      }
      if (!statement.getChild(0).is(EcmaScriptGrammar.BLOCK)) {
        getContext().createLineViolation(this, "Missing curly brace.", astNode);
        break;
      }
    }
  }

}
