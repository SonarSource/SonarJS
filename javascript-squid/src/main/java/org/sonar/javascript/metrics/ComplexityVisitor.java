/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.javascript.metrics;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.squid.SquidAstVisitor;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.sslr.parser.LexerlessGrammar;

public class ComplexityVisitor extends SquidAstVisitor<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(
        EcmaScriptGrammar.FUNCTION_DECLARATION,
        EcmaScriptGrammar.FUNCTION_EXPRESSION,
        // Branching nodes
        EcmaScriptGrammar.IF_STATEMENT,
        EcmaScriptGrammar.ITERATION_STATEMENT,
        EcmaScriptGrammar.CASE_CLAUSE,
        EcmaScriptGrammar.CATCH_,
        EcmaScriptGrammar.RETURN_STATEMENT,
        EcmaScriptGrammar.THROW_STATEMENT,
        // Expressions
        EcmaScriptPunctuator.QUERY,
        EcmaScriptPunctuator.ANDAND,
        EcmaScriptPunctuator.OROR);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(EcmaScriptGrammar.RETURN_STATEMENT) && isLastReturnStatement(astNode)) {
      return;
    }
    getContext().peekSourceCode().add(EcmaScriptMetric.COMPLEXITY, 1);
  }

  private boolean isLastReturnStatement(AstNode astNode) {
    AstNode parent = astNode.getParent().getParent();
    return parent.is(EcmaScriptGrammar.SOURCE_ELEMENT);
  }

}
