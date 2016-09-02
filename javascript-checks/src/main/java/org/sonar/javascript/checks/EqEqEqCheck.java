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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

@Rule(key = "EqEqEq")
public class EqEqEqCheck extends AbstractAllPathSeCheck<BinaryExpressionTree> {

  private Set<BinaryExpressionTree> ignoredList = new HashSet<>();

  @Override
  BinaryExpressionTree getTree(Tree element) {
    if (element.is(Kind.EQUAL_TO, Kind.NOT_EQUAL_TO)) {
      return (BinaryExpressionTree) element;
    }
    return null;
  }

  /**
   * This method returns true for the cases which should be ignored by this rule
   */
  @Override
  boolean isProblem(BinaryExpressionTree tree, ProgramState currentState) {
    Constraint rightConstraint = currentState.getConstraint(currentState.peekStack(0));
    Constraint leftConstraint = currentState.getConstraint(currentState.peekStack(1));

    Type rightType = rightConstraint.type();
    Type leftType = leftConstraint.type();

    if (leftType != null && leftType == rightType) {
      return true;
    }

    return false;
  }


  @Override
  void raiseIssue(BinaryExpressionTree tree) {
    ignoredList.add(tree);
  }

  @Override
  public void startOfFile(ScriptTree scriptTree) {
    ignoredList.clear();
  }

  @Override
  public void endOfFile(ScriptTree scriptTree) {
    EqualityVisitor equalityVisitor = new EqualityVisitor();
    equalityVisitor.scanTree(scriptTree);

    equalityVisitor.equalityExpressions
      .stream()
      .filter(equalityExpression -> !ignoredList.contains(equalityExpression))
      .forEach(equalityExpression ->
        addIssue(equalityExpression.operator(), equalityExpression.is(Kind.EQUAL_TO) ? "Replace \"==\" with \"===\"." : "Replace \"!=\" with \"!==\".")
          .secondary(equalityExpression.leftOperand())
          .secondary(equalityExpression.rightOperand()));

  }

  private static class EqualityVisitor extends SubscriptionVisitor {

    Set<BinaryExpressionTree> equalityExpressions = new HashSet<>();

    @Override
    public List<Kind> nodesToVisit() {
      return ImmutableList.of(Kind.EQUAL_TO, Kind.NOT_EQUAL_TO);
    }

    @Override
    public void visitNode(Tree tree) {
      BinaryExpressionTree binaryExpressionTree = (BinaryExpressionTree) tree;
      if (!isNullLiteral(binaryExpressionTree.leftOperand()) && !isNullLiteral(binaryExpressionTree.rightOperand())) {
        equalityExpressions.add(binaryExpressionTree);
      }
    }

    private static boolean isNullLiteral(ExpressionTree expressionTree) {
      return expressionTree.is(Tree.Kind.NULL_LITERAL);
    }

  }
}
