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
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "EqEqEq",
  name = "\"===\" and \"!==\" should be used instead of \"==\" and \"!=\"",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("5min")
public class EqEqEqCheck extends BaseTreeVisitor {

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (!isNullLiteral(tree.leftOperand()) && !isNullLiteral(tree.rightOperand())) {

      if (tree.is(Tree.Kind.EQUAL_TO)) {
        getContext().addIssue(this, tree.operator(), "Replace \"==\" with \"===\".");

      } else if (tree.is(Tree.Kind.NOT_EQUAL_TO)) {
        getContext().addIssue(this, tree.operator(), "Replace \"!=\" with \"!==\".");
      }
    }

    super.visitBinaryExpression(tree);
  }

  private boolean isNullLiteral(ExpressionTree expressionTree) {
    return expressionTree.is(Tree.Kind.NULL_LITERAL);
  }

}
