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

import java.util.ArrayDeque;
import java.util.Deque;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.tree.impl.statement.IfStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "NestedIfDepth",
  name = "Control flow statements \"if\", \"for\", \"while\", \"switch\" and \"try\" should not be nested too deeply",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_CHANGEABILITY)
@SqaleConstantRemediation("10min")
public class NestedControlFlowDepthCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Refactor this code to not nest more than %s if/for/while/switch/try statements.";
  private static final int DEFAULT_MAXIMUM_NESTING_LEVEL = 3;
  private Deque<SyntaxToken> stack = new ArrayDeque<>();

  @RuleProperty(
    key = "maximumNestingLevel",
    description = "Maximum allowed \"if/for/while/switch/try\" statements nesting depth",
    defaultValue = "" + DEFAULT_MAXIMUM_NESTING_LEVEL)
  public int maximumNestingLevel = DEFAULT_MAXIMUM_NESTING_LEVEL;

  public int getMaximumNestingLevel() {
    return maximumNestingLevel;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    stack.clear();
    super.visitScript(tree);
  }

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    increaseAndCheckNestedLevel(tree.ifKeyword());
    visitIf(tree);
    decreaseNestedLevel();
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    increaseAndCheckNestedLevel(tree.forKeyword());
    super.visitForStatement(tree);
    decreaseNestedLevel();
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    increaseAndCheckNestedLevel(tree.forKeyword());
    super.visitForObjectStatement(tree);
    decreaseNestedLevel();
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    increaseAndCheckNestedLevel(tree.whileKeyword());
    super.visitWhileStatement(tree);
    decreaseNestedLevel();
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    increaseAndCheckNestedLevel(tree.doKeyword());
    super.visitDoWhileStatement(tree);
    decreaseNestedLevel();
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    increaseAndCheckNestedLevel(tree.switchKeyword());
    super.visitSwitchStatement(tree);
    decreaseNestedLevel();
  }

  @Override
  public void visitTryStatement(TryStatementTree tree) {
    increaseAndCheckNestedLevel(tree.tryKeyword());
    super.visitTryStatement(tree);
    decreaseNestedLevel();
  }

  private void increaseAndCheckNestedLevel(SyntaxToken token) {
    if (stack.size() == getMaximumNestingLevel()) {
      PreciseIssue issue = addIssue(token, String.format(MESSAGE, getMaximumNestingLevel()));
      stack.forEach(t -> issue.secondary(t, "Nesting +1"));
    }
    stack.push(token);
  }

  private void decreaseNestedLevel() {
    stack.pop();
  }

  private void visitIf(IfStatementTree tree) {
    scan(tree.condition());
    scan(tree.statement());

    ElseClauseTree elseClauseTree = tree.elseClause();
    if (tree.elseClause() != null && elseClauseTree.statement().is(Kind.IF_STATEMENT)) {
      visitIf((IfStatementTreeImpl) tree.elseClause().statement());

    } else {
      scan(tree.elseClause());
    }
  }

}
