/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

@Rule(key = "S2583")
public class AlwaysTrueOrFalseConditionCheck extends SeCheck {

  private Set<LiteralTree> ignoredLoopConditions;

  @Override
  public void startOfExecution(Scope functionScope) {
    ignoredLoopConditions = new HashSet<>();
    Tree tree = functionScope.tree();
    tree.accept(new LoopsVisitor());
  }

  @Override
  public void checkConditions(Map<Tree, Collection<Constraint>> conditions) {
    for (Entry<Tree, Collection<Constraint>> entry : conditions.entrySet()) {
      if (ignoredLoopConditions.contains(entry.getKey())) {
        continue;
      }
      Collection<Constraint> results = entry.getValue();
      if (results.size() == 1) {
        Constraint constraint = results.iterator().next();

        if (!isTruthyLiteral(entry.getKey(), constraint)) {
          String result = isTruthy(constraint) ? "true" : "false";
          addIssue(entry.getKey(), String.format("Change this condition so that it does not always evaluate to \"%s\".", result));
        }
      }
    }
  }

  private static boolean isTruthyLiteral(Tree tree, Constraint constraint) {
    ExpressionTree conditionWithoutParentheses = CheckUtils.removeParenthesis((ExpressionTree) tree);

    return isTruthy(constraint)
      && conditionWithoutParentheses.is(
        Kind.ARRAY_LITERAL,
        Kind.OBJECT_LITERAL,
        Kind.NEW_EXPRESSION,
        Kind.NUMERIC_LITERAL,
        Kind.STRING_LITERAL);
  }

  private static boolean isTruthy(Constraint constraint) {
    return Constraint.TRUTHY.equals(constraint);
  }

  private class LoopsVisitor extends DoubleDispatchVisitor {
    @Override
    public void visitForStatement(ForStatementTree tree) {
      checkCondition(tree.condition());
      super.visitForStatement(tree);
    }

    @Override
    public void visitWhileStatement(WhileStatementTree tree) {
      checkCondition(tree.condition());
      super.visitWhileStatement(tree);
    }

    @Override
    public void visitDoWhileStatement(DoWhileStatementTree tree) {
      checkCondition(tree.condition());
      super.visitDoWhileStatement(tree);
    }

    private void checkCondition(@Nullable ExpressionTree condition) {
      if (condition != null && condition.is(Kind.BOOLEAN_LITERAL, Kind.NUMERIC_LITERAL)) {
        ignoredLoopConditions.add((LiteralTree) condition);
      }
    }
  }

}
