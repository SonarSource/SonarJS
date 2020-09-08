/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
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

import com.google.common.collect.Sets;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;

@JavaScriptRule
@Rule(key = "S3403")
public class DifferentTypesComparisonCheck extends SeCheck {

  private static final String MESSAGE_EQUAL = "Remove this \"===\" check; it will always be false. Did you mean to use \"==\"?";
  private static final String MESSAGE_NOT_EQUAL = "Remove this \"!==\" check; it will always be true. Did you mean to use \"!=\"?";

  // For each string equality comparison tree this map contains true if types are different in all execution paths, true if types are alike in at least one execution path
  private Map<BinaryExpressionTree, Boolean> typeDifference = new HashMap<>();


  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (element.is(Kind.STRICT_NOT_EQUAL_TO, Kind.STRICT_EQUAL_TO)) {

      BinaryExpressionTree comparison = (BinaryExpressionTree) element;

      Constraint rightConstraint = currentState.getConstraint(currentState.peekStack(0));
      Constraint leftConstraint = currentState.getConstraint(currentState.peekStack(1));

      Set<Type> rightType = rightConstraint.typeSet();
      Set<Type> leftType = leftConstraint.typeSet();

      boolean differentTypes = !rightType.isEmpty() && !leftType.isEmpty() && Sets.intersection(rightType, leftType).isEmpty();

      if (!differentTypes) {
        typeDifference.put(comparison, false);

      } else if (!typeDifference.containsKey(comparison)) {
        typeDifference.put(comparison, true);
      }
    }
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    for (Entry<BinaryExpressionTree, Boolean> entry : typeDifference.entrySet()) {
      if (entry.getValue()) {
        raiseIssue(entry.getKey());
      }
    }
  }

  @Override
  public void startOfExecution(Scope functionScope) {
    typeDifference.clear();
  }

  private void raiseIssue(BinaryExpressionTree tree) {
    String message = tree.is(Kind.STRICT_EQUAL_TO) ? MESSAGE_EQUAL : MESSAGE_NOT_EQUAL;

    addIssue(tree.operatorToken(), message)
      .secondary(tree.leftOperand())
      .secondary(tree.rightOperand());
  }
}
