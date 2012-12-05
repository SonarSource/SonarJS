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
import org.sonar.javascript.api.EcmaScriptGrammar;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.javascript.api.EcmaScriptPunctuator;

public class ComplexityVisitor extends SquidAstVisitor<EcmaScriptGrammar> {

  @Override
  public void init() {
    EcmaScriptGrammar grammar = getContext().getGrammar();
    subscribeTo(
        grammar.functionDeclaration,
        grammar.functionExpression,
        // Branching nodes
        grammar.ifStatement,
        grammar.iterationStatement,
        grammar.caseClause,
        grammar.catch_,
        grammar.returnStatement,
        grammar.throwStatement,
        // Expressions
        EcmaScriptPunctuator.QUERY,
        EcmaScriptPunctuator.ANDAND,
        EcmaScriptPunctuator.OROR);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (astNode.is(getContext().getGrammar().returnStatement) && isLastReturnStatement(astNode)) {
      return;
    }
    getContext().peekSourceCode().add(EcmaScriptMetric.COMPLEXITY, 1);
  }

  private boolean isLastReturnStatement(AstNode astNode) {
    AstNode parent = astNode.getParent().getParent();
    return parent.is(getContext().getGrammar().sourceElement);
  }

}
