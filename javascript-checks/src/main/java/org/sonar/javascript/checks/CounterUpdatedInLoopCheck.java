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

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.statement.VariableDeclarationTreeImpl;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S2310")
public class CounterUpdatedInLoopCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this assignment of \"%s\".";
  private static final String SECONDARY_MESSAGE = "Counter variable update";

  /**
   * Map<IdentifierTree, IdentifierTree> contains pairs <Usage identifier, Identifier used in for loop update clause>
   */
  private Deque<Map<IdentifierTree, IdentifierTree>> writeUsagesOfCounters = new ArrayDeque<>();

  private Set<IdentifierTree> currentLoopCounters = null;
  private boolean inUpdate = false;

  @Override
  public void visitForStatement(ForStatementTree tree) {
    scan(tree.init());
    scan(tree.condition());

    currentLoopCounters = new HashSet<>();
    inUpdate = true;
    scan(tree.update());
    inUpdate = false;

    enterLoopBody();
    scan(tree.statement());
    leaveLoopBody();
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    scan(tree.variableOrExpression());
    scan(tree.expression());
    visitObjectIterationStatement(tree, tree.variableOrExpression());
  }

  @Override
  public void visitIdentifier(IdentifierTree tree) {
    for (Map<IdentifierTree, IdentifierTree> currentLoopCounterUsages : writeUsagesOfCounters) {

      IdentifierTree identifierUsedInUpdateClause = currentLoopCounterUsages.get(tree);
      if (identifierUsedInUpdateClause != null) {
        raiseIssue(tree, identifierUsedInUpdateClause);
        return;
      }
    }
  }

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (inUpdate && tree.is(KindSet.INC_DEC_KINDS)) {
      addCurrentLoopCounter(tree.expression());
    }

    super.visitUnaryExpression(tree);
  }

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    if (inUpdate) {
      addCurrentLoopCounter(tree.variable());
    }

    super.visitAssignmentExpression(tree);
  }

  private void addCurrentLoopCounter(Tree tree) {
    if (tree.is(Kind.IDENTIFIER_REFERENCE, Kind.BINDING_IDENTIFIER)) {
      currentLoopCounters.add((IdentifierTree) tree);
    }
  }

  private void visitObjectIterationStatement(IterationStatementTree tree, Tree counterBlock) {
    currentLoopCounters = new HashSet<>();
    scanCounterBlock(counterBlock);
    enterLoopBody();
    scan(tree.statement());
    leaveLoopBody();
  }


  private void scanCounterBlock(Tree counterBlock) {

    if (counterBlock instanceof VariableDeclarationTree) {
      for (IdentifierTree identifierTree : ((VariableDeclarationTreeImpl) counterBlock).variableIdentifiers()) {
        addCurrentLoopCounter(identifierTree);
      }

    } else if (counterBlock instanceof AssignmentExpressionTree) {
      scanCounterBlock(((AssignmentExpressionTree) counterBlock).variable());

    } else {
      addCurrentLoopCounter(counterBlock);

    }

  }

  private void enterLoopBody() {
    Map<IdentifierTree, IdentifierTree> writeUsages = new HashMap<>();

    for (IdentifierTree identifierTree : currentLoopCounters) {
      Optional<Symbol> symbol = identifierTree.symbol();
      if (symbol.isPresent()) {
        for (Usage usage : symbol.get().usages()) {
          if (usage.isWrite()) {
            writeUsages.put(usage.identifierTree(), identifierTree);
          }
        }
      }
    }

    writeUsagesOfCounters.addLast(writeUsages);
  }

  private void leaveLoopBody() {
    writeUsagesOfCounters.removeLast();
  }

  private void raiseIssue(IdentifierTree writeUsage, IdentifierTree identifierUsedInUpdateClause) {
    String message = String.format(MESSAGE, writeUsage.name());
    addIssue(writeUsage, message)
      .secondary(identifierUsedInUpdateClause, SECONDARY_MESSAGE);
  }
}
