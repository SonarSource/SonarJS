/*
 * Sonar JavaScript Plugin
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
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

@Rule(
  key = "NonEmptyCaseWithoutBreak",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class NonEmptyCaseWithoutBreakCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(EcmaScriptGrammar.CASE_CLAUSE, EcmaScriptGrammar.DEFAULT_CLAUSE);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.getNextAstNode().is(EcmaScriptGrammar.CASE_CLAUSE, EcmaScriptGrammar.DEFAULT_CLAUSE, EcmaScriptGrammar.CASE_CLAUSES)) {
      AstNode statementList = astNode.getFirstChild(EcmaScriptGrammar.STATEMENT_LIST);
      if (statementList != null
        && statementList.getLastChild().getFirstChild().isNot(EcmaScriptGrammar.BREAK_STATEMENT, EcmaScriptGrammar.RETURN_STATEMENT, EcmaScriptGrammar.THROW_STATEMENT)) {
        getContext().createLineViolation(this, "Last statement in this switch-clause should be an unconditional break.", astNode);
      }
    }
  }

}
