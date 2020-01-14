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

import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.SyntacticEquivalence;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

@JavaScriptRule
@Rule(key = "S4165")
public class RedundantAssignmentCheck extends AbstractAllPathSeCheck<AssignmentExpressionTree> {

  private static final String MESSAGE = "Review this useless assignment: \"%s\" already holds the assigned value along all execution paths.";

  @Override
  AssignmentExpressionTree getTree(Tree element) {
    if (element.is(Tree.Kind.ASSIGNMENT)) {
      return (AssignmentExpressionTree) element;
    } else {
      return null;
    }
  }

  @Override
  boolean isProblem(AssignmentExpressionTree tree, ProgramState currentState) {
    SymbolicValue rightSide = currentState.peekStack(0);
    SymbolicValue leftSide = currentState.peekStack(1);
    if (!tree.variable().is(Tree.Kind.IDENTIFIER_REFERENCE) || SyntacticEquivalence.areEquivalent(tree.variable(), tree.expression())) {
      return false;
    }

    if (leftSide instanceof UnknownSymbolicValue || rightSide instanceof UnknownSymbolicValue) {
      return false;
    }
    if (leftSide == rightSide) {
      return true;
    }

    Constraint leftConstraint = currentState.getConstraint(leftSide);
    Constraint rightConstraint = currentState.getConstraint(rightSide);
    return leftConstraint.isSingleValue() && rightConstraint.isSingleValue() && leftConstraint.equals(rightConstraint);
  }

  @Override
  void raiseIssue(AssignmentExpressionTree tree) {
    IdentifierTree variable = (IdentifierTree) tree.variable();
    addIssue(tree, String.format(MESSAGE, variable.name()));
  }
}
