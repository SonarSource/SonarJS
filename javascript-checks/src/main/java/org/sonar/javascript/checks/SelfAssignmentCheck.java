/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.tree.SyntacticEquivalence;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S1656")
public class SelfAssignmentCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove or correct this useless self-assignment.";
  private static final Set<String> METHODS_WITH_SIDE_EFFECTS = new HashSet<>(Arrays.asList("sort", "reverse"));

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    ExpressionTree variable = tree.variable();

    if (tree.is(Tree.Kind.ASSIGNMENT) && variable.is(Kind.IDENTIFIER_REFERENCE) && sameValue((IdentifierTree) variable, tree.expression())) {
      addIssue(tree, MESSAGE);
    }

    super.visitAssignmentExpression(tree);
  }

  private static boolean sameValue(IdentifierTree variable, ExpressionTree expression) {
    if (SyntacticEquivalence.areEquivalent(variable, expression)) {
      return true;
    }

    if (expression.is(Kind.CALL_EXPRESSION) && ((CallExpressionTree) expression).callee().is(Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree callee = (DotMemberExpressionTree) ((CallExpressionTree) expression).callee();
      String method = callee.property().name();
      return sameValue(variable, callee.object()) && METHODS_WITH_SIDE_EFFECTS.contains(method);
    }

    return false;
  }
}
