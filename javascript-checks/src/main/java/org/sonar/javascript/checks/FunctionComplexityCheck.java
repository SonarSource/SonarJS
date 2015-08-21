/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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

import com.google.common.collect.ImmutableList;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;

@Rule(
    key = "FunctionComplexity",
    name = "Functions should not be too complex",
    priority = Priority.MAJOR,
    tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNIT_TESTABILITY)
@SqaleConstantRemediation("1h")
public class FunctionComplexityCheck extends SubscriptionBaseTreeVisitor {

  private static final int DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD = 10;

  @RuleProperty(
      key = "maximumFunctionComplexityThreshold",
      description = "The maximum authorized complexity in function",
      defaultValue = "" + DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD)
  private int maximumFunctionComplexityThreshold = DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD;
  private boolean immediatelyInvokedFunctionExpression = false;
  private boolean amdPattern = false;

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
        Kind.FUNCTION_DECLARATION,
        Kind.FUNCTION_EXPRESSION,
        Kind.GENERATOR_FUNCTION_EXPRESSION,
        Kind.GENERATOR_DECLARATION,
        Kind.METHOD,
        Kind.GENERATOR_METHOD,
        Kind.CALL_EXPRESSION,
        Kind.NEW_EXPRESSION
    );
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.CALL_EXPRESSION)) {
      checkForImmediatelyInvokedFunction(((CallExpressionTree) tree).callee());
      checkForAMDPattern((CallExpressionTree) tree);

    } else if (tree.is(Kind.NEW_EXPRESSION)) {
      if (((NewExpressionTree) tree).arguments() != null) {
        checkForImmediatelyInvokedFunction(((NewExpressionTree) tree).expression());
      }

    } else {
      visitFunction(tree);
    }

  }

  private void visitFunction(Tree tree) {
    if (immediatelyInvokedFunctionExpression || amdPattern) {
      clearCheckState();
    } else {
      int complexity = getContext().getComplexity(tree);
      if (complexity > maximumFunctionComplexityThreshold) {
        String message = String.format("Function has a complexity of %s which is greater than %s authorized.", complexity, maximumFunctionComplexityThreshold);
        addIssue(tree, message);
      }
    }
  }

  public void setMaximumFunctionComplexityThreshold(int threshold) {
    this.maximumFunctionComplexityThreshold = threshold;
  }

  private void checkForImmediatelyInvokedFunction(ExpressionTree callee) {
    Kind[] funcExprKinds = {Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION};
    boolean directFunctionCallee = callee.is(funcExprKinds);
    boolean parenthesisedFunctionCallee = callee.is(Kind.PARENTHESISED_EXPRESSION) && ((ParenthesisedExpressionTree) callee).expression().is(funcExprKinds);
    if (directFunctionCallee || parenthesisedFunctionCallee) {
      immediatelyInvokedFunctionExpression = true;
    }
  }

  private void checkForAMDPattern(CallExpressionTree tree) {
    if (tree.callee().is(Kind.IDENTIFIER_REFERENCE) && "define".equals(((IdentifierTree) tree.callee()).name())) {
      for (Tree parameter : tree.arguments().parameters()) {
        if (parameter.is(Kind.FUNCTION_EXPRESSION)) {
          amdPattern = true;
        }
      }
    }
  }

  private void clearCheckState() {
    immediatelyInvokedFunctionExpression = false;
    amdPattern = false;
  }

}
