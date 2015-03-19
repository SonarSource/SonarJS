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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.NewExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ParenthesisedExpressionTree;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

/**
 * http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml?showone=Parentheses#Parentheses
 *
 * @author Eriks Nukis
 */
@Rule(
  key = "Parentheses",
  name = "Useless parentheses around expressions should be removed to prevent any misunderstanding",
  priority = Priority.MAJOR,
  tags = {Tags.CONFUSING})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("1min")
public class ParenthesesCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(
      Kind.DELETE,
      Kind.TYPEOF,
      Kind.VOID,
      EcmaScriptKeyword.RETURN,
      EcmaScriptKeyword.THROW,
      Kind.NEW_EXPRESSION,
      EcmaScriptKeyword.IN);
  }

  @Override
  public void visitNode(AstNode node) {
    if (node.is(Kind.DELETE, Kind.TYPEOF, Kind.VOID)) {
      UnaryExpressionTree prefixExpr = (UnaryExpressionTree) node;

      if (prefixExpr.expression().is(Kind.PARENTHESISED_EXPRESSION)) {
        reportIssue(node);
      }

    } else if (node.is(Kind.NEW_EXPRESSION)) {
      NewExpressionTree tree = (NewExpressionTree) node;

      if (tree.arguments() == null &&
        tree.expression().is(Kind.PARENTHESISED_EXPRESSION) && !(((ParenthesisedExpressionTree) tree.expression()).expression() instanceof BinaryExpressionTree)) {
        reportIssue(node);
      }

    } else if (isNotRelationalInExpression(node) && node.getNextAstNode().is(Kind.PARENTHESISED_EXPRESSION)) {
      reportIssue(node);
    }
  }

  private boolean isNotRelationalInExpression(AstNode node) {
    return !(node.is(EcmaScriptKeyword.IN) && node.getParent().is(Kind.RELATIONAL_IN));
  }

  private void reportIssue(AstNode node) {
    getContext().createLineViolation(this, "Those parentheses are useless.", node);
  }

}
