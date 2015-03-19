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

import java.util.List;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.collect.ImmutableList;

@Rule(
  key = "S2688",
  name = "\"NaN\" should not be used in comparisons",
  priority = Priority.BLOCKER,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5min")
public class ComparisonWithNaNCheck extends SubscriptionBaseVisitor {

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
      Kind.EQUAL_TO,
      Kind.NOT_EQUAL_TO,
      Kind.STRICT_EQUAL_TO,
      Kind.STRICT_NOT_EQUAL_TO);
  }

  @Override
  public void visitNode(Tree tree) {
    BinaryExpressionTree equalityExpr = (BinaryExpressionTree) tree;

    if (isNaN(equalityExpr.leftOperand()) || isNaN(equalityExpr.rightOperand())) {
      addIssue(tree, "Use a test of the format \"a " + equalityExpr.operator().text() + " a\" instead.");
    }
  }

  private boolean isNaN(ExpressionTree expression) {
    return expression.is(Kind.IDENTIFIER_REFERENCE) && "NaN".equals(((IdentifierTree) expression).name());
  }

}
