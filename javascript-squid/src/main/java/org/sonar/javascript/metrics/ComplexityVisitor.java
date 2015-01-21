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
package org.sonar.javascript.metrics;

import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.squidbridge.SquidAstVisitor;
import org.sonar.sslr.parser.LexerlessGrammar;

public class ComplexityVisitor extends SquidAstVisitor<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(
      // Functions
      Kind.FUNCTION_DECLARATION,
      Kind.FUNCTION_EXPRESSION,
      Kind.METHOD,
      Kind.GENERATOR_METHOD,
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      Kind.GENERATOR_DECLARATION,
      // Branching nodes
      Kind.IF_STATEMENT,
      Kind.DO_WHILE_STATEMENT,
      Kind.WHILE_STATEMENT,
      Kind.FOR_IN_STATEMENT,
      Kind.FOR_OF_STATEMENT,
      Kind.FOR_STATEMENT,
      Kind.CASE_CLAUSE,
      Kind.CATCH_BLOCK,
      Kind.RETURN_STATEMENT,
      Kind.THROW_STATEMENT,
      // Expressions
      EcmaScriptPunctuator.QUERY,
      EcmaScriptPunctuator.ANDAND,
      EcmaScriptPunctuator.OROR);
  }

  @Override
  public void visitNode(AstNode astNode) {

    if (astNode.is(Kind.RETURN_STATEMENT) && isLastReturnStatement(astNode)) {
      return;
    }
    getContext().peekSourceCode().add(EcmaScriptMetric.COMPLEXITY, 1);
  }

  private static boolean isLastReturnStatement(AstNode returnNode) {
    AstNode nextNode = returnNode.getNextAstNode();
    return nextNode.is(EcmaScriptPunctuator.RCURLYBRACE) && isNotNested(returnNode);
  }

  private static boolean isNotNested(AstNode returnNode) {
    AstNode parent = returnNode
      // Statement list
      .getParent();
    return parent.getParent().is(Kind.BLOCK) &&
      parent.getParent().getParent().is(
        Kind.SET_METHOD,
        Kind.GET_METHOD,
        Kind.METHOD,
        Kind.GENERATOR_METHOD,
        Kind.GENERATOR_FUNCTION_EXPRESSION,
        Kind.FUNCTION_EXPRESSION,
        Kind.FUNCTION_DECLARATION,
        Kind.GENERATOR_DECLARATION);
  }

}
