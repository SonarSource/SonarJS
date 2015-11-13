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
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleLinearWithOffsetRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;

@Rule(
  key = "S1067",
  name = "Expressions should not be too complex",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNIT_TESTABILITY)
@SqaleLinearWithOffsetRemediation(
  coeff = "1min",
  offset = "5min",
  effortToFixDescription = "per complexity point above the threshold")
@ActivatedByDefault
public class ExpressionComplexityCheck extends SubscriptionBaseTreeVisitor {

  private static final int DEFAULT = 3;
  private static final String MESSAGE = "Reduce the number of conditional operators (%s) used in the expression (maximum allowed %s).";

  @RuleProperty(defaultValue = "" + DEFAULT, description = "Maximum number of allowed conditional operators in an expression")
  public int max = DEFAULT;

  private List<ExpressionComplexity> statementLevel = Lists.newArrayList();
  private static final Kind[] SCOPES = {
    Kind.FUNCTION_EXPRESSION,
    Kind.GENERATOR_FUNCTION_EXPRESSION
  };

  private static final Kind[] CONDITIONAL_EXPRS = {
    Kind.CONDITIONAL_EXPRESSION,
    Kind.CONDITIONAL_AND,
    Kind.CONDITIONAL_OR
  };

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      .add(CONDITIONAL_EXPRS)
      .add(SCOPES).build();
  }

  public static class ExpressionComplexity {
    private int nestedLevel = 0;
    private int counterOperator = 0;

    public void increaseOperatorCounter(int nbOperator) {
      counterOperator += nbOperator;
    }

    public void incrementNestedExprLevel() {
      nestedLevel++;
    }

    public void decrementNestedExprLevel() {
      nestedLevel--;
    }

    public boolean isOnFirstExprLevel() {
      return nestedLevel == 0;
    }

    public int getExprNumberOfOperator() {
      return counterOperator;
    }

    public void resetExprOperatorCounter() {
      counterOperator = 0;
    }
  }

  @Override
  public void visitFile(Tree scriptTree) {
    statementLevel.clear();
    statementLevel.add(new ExpressionComplexity());
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(CONDITIONAL_EXPRS)) {
      Iterables.getLast(statementLevel).incrementNestedExprLevel();
      Iterables.getLast(statementLevel).increaseOperatorCounter(1);

    } else if (tree.is(SCOPES)) {
      statementLevel.add(new ExpressionComplexity());
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(CONDITIONAL_EXPRS)) {
      ExpressionComplexity currentExpression = Iterables.getLast(statementLevel);
      currentExpression.decrementNestedExprLevel();

      if (currentExpression.isOnFirstExprLevel()) {
        int complexity = currentExpression.getExprNumberOfOperator();
        if (complexity > max) {
          String message = String.format(MESSAGE, complexity, max);
          getContext().addIssue(this, tree, message, (double) (complexity - max));
        }
        currentExpression.resetExprOperatorCounter();
      }

    } else if (tree.is(SCOPES)) {
      statementLevel.remove(statementLevel.size() - 1);
    }
  }

}
