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

public abstract class AbstractAlwaysTrueOrFalseConditionCheck extends SeCheck {

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
      Tree conditionTree = entry.getKey();

      if (ignoredLoopConditions.contains(conditionTree)) {
        continue;
      }

      Collection<Constraint> results = entry.getValue();

      if (results.size() == 1 && !conditionTree.is(Kind.ASSIGNMENT)) {
        Constraint constraint = results.iterator().next();
        checkCondition(conditionTree, constraint);
      }
    }
  }

  abstract void checkCondition(Tree conditionTree, Constraint constraint);

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
