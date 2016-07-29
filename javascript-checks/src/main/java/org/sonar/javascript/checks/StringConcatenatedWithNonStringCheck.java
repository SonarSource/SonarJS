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
import javax.annotation.CheckForNull;
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
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3402",
  name = "Strings and non-strings should not be added",
  priority = Priority.MAJOR,
  tags = Tags.SUSPICIOUS)
@ActivatedByDefault
@SqaleConstantRemediation("15min")
public class StringConcatenatedWithNonStringCheck extends SeCheck {

  private static final String MESSAGE = "Either make this concatenation explicit or cast one operand to a number.";

  // For each "+" binary expression tree this map contains true if types of operands are string and non-string in all execution paths,
  // true if types are good in at least one execution path
  private Map<BinaryExpressionTree, Boolean> appropriateTypes = new HashMap<>();

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(Kind.PLUS)) {

      BinaryExpressionTree expression = (BinaryExpressionTree) element;

      ExpressionTree onlyStringOperand = getOnlyStringOperand(expression.leftOperand(), expression.rightOperand(), currentState);

      if (onlyStringOperand == null || !onlyStringOperand.is(Kind.IDENTIFIER_REFERENCE)) {
        appropriateTypes.put(expression, false);

      } else if (!appropriateTypes.containsKey(expression)) {
        appropriateTypes.put(expression, true);
      }
    }
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    for (Entry<BinaryExpressionTree, Boolean> entry : appropriateTypes.entrySet()) {
      if (entry.getValue()) {
        BinaryExpressionTree tree = entry.getKey();
        addIssue(tree.operator(), MESSAGE)
          .secondary(tree.leftOperand())
          .secondary(tree.rightOperand());
      }
    }
  }

  @Override
  public void startOfExecution(Scope functionScope) {
    appropriateTypes.clear();
  }

  @CheckForNull
  private static ExpressionTree getOnlyStringOperand(ExpressionTree leftOperand, ExpressionTree rightOperand, ProgramState currentState) {
    Constraint rightConstraint = currentState.getConstraint(currentState.peekStack(0));
    Constraint leftConstraint = currentState.getConstraint(currentState.peekStack(1));

    Type rightType = rightConstraint.type();
    Type leftType = leftConstraint.type();


    if (leftType != null && rightType != null) {

      if (leftType == Type.STRING && rightType != Type.STRING) {
        return leftOperand;

      } else if (leftType != Type.STRING && rightType == Type.STRING) {
        return rightOperand;
      }
    }

    return null;
  }

}
