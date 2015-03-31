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
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.NewExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ParenthesisedExpressionTree;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;
import org.sonar.javascript.model.interfaces.statement.ForInStatementTree;
import org.sonar.javascript.model.interfaces.statement.ReturnStatementTree;
import org.sonar.javascript.model.interfaces.statement.ThrowStatementTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import javax.annotation.Nullable;

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
public class ParenthesesCheck extends BaseTreeVisitor {

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree){
    if (tree.is(Kind.DELETE, Kind.TYPEOF, Kind.VOID)){
      checkExpression(tree.expression());
    }
    super.visitUnaryExpression(tree);
  }

  @Override
  public void visitReturnStatement(ReturnStatementTree tree){
    checkExpression(tree.expression());
    super.visitReturnStatement(tree);
  }

  @Override
  public void visitThrowStatement(ThrowStatementTree tree){
    checkExpression(tree.expression());
    super.visitThrowStatement(tree);
  }

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    if (tree.arguments() == null) {
      checkExpression(tree.expression());
    }
    super.visitNewExpression(tree);
  }

  @Override
  public void visitForInStatement(ForInStatementTree tree) {
    checkExpression(tree.expression());
    super.visitForInStatement(tree);
  }

  private void checkExpression(@Nullable ExpressionTree expression) {
    if (expression != null && expression.is(Kind.PARENTHESISED_EXPRESSION)){
      String expressingString = CheckUtils.asString(((ParenthesisedExpressionTree) expression).expression());
      getContext().addIssue(this, expression, String.format("The parentheses around \"%s\" are useless.", expressingString));
    }
  }

}
