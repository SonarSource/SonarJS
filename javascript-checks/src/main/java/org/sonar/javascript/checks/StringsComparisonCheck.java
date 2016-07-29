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

import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3003",
  name = "Comparison operators should not be used with strings",
  priority = Priority.MAJOR,
  tags = Tags.SUSPICIOUS)
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class StringsComparisonCheck extends SeCheck {

  private static final String MESSAGE = "Convert operands of this use of \"%s\" to number type.";

  private static final Kind[] RELATIVE_OPERATIONS = {
    Kind.LESS_THAN,
    Kind.LESS_THAN_OR_EQUAL_TO,
    Kind.GREATER_THAN,
    Kind.GREATER_THAN_OR_EQUAL_TO
  };

  // For each string comparison tree this map contains true if types of operands are sting in all execution paths, true if not in at least one execution path
  private Map<BinaryExpressionTree, Boolean> stringsComparisons = new HashMap<>();

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(RELATIVE_OPERATIONS)) {

      BinaryExpressionTree comparison = (BinaryExpressionTree) element;

      Constraint rightConstraint = currentState.getConstraint(currentState.peekStack(0));
      Constraint leftConstraint = currentState.getConstraint(currentState.peekStack(1));

      Type rightType = rightConstraint.type();
      Type leftType = leftConstraint.type();

      boolean stringsCompared = rightType == Type.STRING && leftType == Type.STRING;

      if (!stringsCompared) {
        stringsComparisons.put(comparison, false);

      } else if (!stringsComparisons.containsKey(comparison)) {
        stringsComparisons.put(comparison, true);
      }
    }
  }

  @Override
  public void startOfExecution(Scope functionScope) {
    stringsComparisons.clear();
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    for (Entry<BinaryExpressionTree, Boolean> entry : stringsComparisons.entrySet()) {
      if (entry.getValue() && !hasOneSymbolLiteralOperand(entry.getKey())) {
        raiseIssue(entry.getKey());
      }
    }
  }

  private static boolean hasOneSymbolLiteralOperand(BinaryExpressionTree expression) {
    LiteralTree literal =  null;
    if (expression.leftOperand().is(Kind.STRING_LITERAL)) {
      literal = (LiteralTree) expression.leftOperand();

    } else if (expression.rightOperand().is(Kind.STRING_LITERAL)) {
      literal = (LiteralTree) expression.rightOperand();
    }

    return literal != null && literal.value().length() == 3;
  }

  private void raiseIssue(BinaryExpressionTree tree) {
    String message = String.format(MESSAGE, tree.operator().text());

    addIssue(tree.operator(), message)
      .secondary(tree.leftOperand())
      .secondary(tree.rightOperand());
  }
}
