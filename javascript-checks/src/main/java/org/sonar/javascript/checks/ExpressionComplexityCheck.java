/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import java.util.ArrayList;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleLinearWithOffsetRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

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
public class ExpressionComplexityCheck extends SubscriptionVisitorCheck {

  private static final int DEFAULT = 3;
  private static final String MESSAGE = "Reduce the number of conditional operators (%s) used in the expression (maximum allowed %s).";

  @RuleProperty(description = "Maximum number of allowed conditional operators in an expression", defaultValue = "" + DEFAULT)
  public int max = DEFAULT;

  private List<ExpressionComplexity> statementLevel = Lists.newArrayList();
  private static final Kind[] SCOPES = {
    Kind.FUNCTION_EXPRESSION,
    Kind.GENERATOR_FUNCTION_EXPRESSION,
    Kind.OBJECT_LITERAL,
    Kind.CALL_EXPRESSION
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
    private List<SyntaxToken> operators = new ArrayList<>();

    public void addOperator(SyntaxToken operator) {
      operators.add(operator);
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

    public List<SyntaxToken> getComplexityOperators() {
      return operators;
    }

    public void resetExpressionComplexityOperators() {
      operators = new ArrayList<>();
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
      Iterables.getLast(statementLevel).addOperator(getOperatorToken(tree));

    } else if (tree.is(SCOPES)) {
      statementLevel.add(new ExpressionComplexity());
    }
  }

  private static SyntaxToken getOperatorToken(Tree tree) {
    if (tree.is(Kind.CONDITIONAL_EXPRESSION)) {
      return ((ConditionalExpressionTree) tree).query();

    } else if (tree.is(Kind.CONDITIONAL_AND, Kind.CONDITIONAL_OR)) {
      return ((BinaryExpressionTree) tree).operator();
    }

    throw new IllegalStateException("Cannot get operator for " + tree);
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(CONDITIONAL_EXPRS)) {
      ExpressionComplexity currentExpression = Iterables.getLast(statementLevel);
      currentExpression.decrementNestedExprLevel();

      if (currentExpression.isOnFirstExprLevel()) {
        List<SyntaxToken> complexityOperators = currentExpression.getComplexityOperators();

        if (complexityOperators.size() > max) {
          addIssue(tree, complexityOperators);
        }
        currentExpression.resetExpressionComplexityOperators();
      }

    } else if (tree.is(SCOPES)) {
      statementLevel.remove(statementLevel.size() - 1);
    }
  }

  private void addIssue(Tree expression, List<SyntaxToken> complexityOperators) {
    int complexity = complexityOperators.size();
    String message = String.format(MESSAGE, complexity, max);

    PreciseIssue issue = addIssue(expression, message);
    for (SyntaxToken complexityOperator : complexityOperators) {
      issue.secondary(complexityOperator, "+1");
    }

    issue.cost ((double) complexity - max);
  }

}
