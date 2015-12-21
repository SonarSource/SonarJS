/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.tree.impl.statement.IfStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForOfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
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
public class NestedControlFlowDepthCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Refactor this code to not nest more than %s if/for/while/switch/try statements.";
  private static final int DEFAULT_MAXIMUM_NESTING_LEVEL = 3;
  private int nestedLevel;

  @RuleProperty(
    key = "maximumNestingLevel",
    description = "Maximum allowed \"if/for/while/switch/try\" statements nesting depth",
    defaultValue = "" + DEFAULT_MAXIMUM_NESTING_LEVEL)
  public int maximumNestingLevel = DEFAULT_MAXIMUM_NESTING_LEVEL;

  public int getMaximumNestingLevel() {
    return maximumNestingLevel;
  }

  @Override
  public void scanFile(TreeVisitorContext context) {
    super.scanFile(context);
    nestedLevel = 0;
  }

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    visitIf(tree);
    nestedLevel--;
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    super.visitForStatement(tree);
    nestedLevel--;
  }

  @Override
  public void visitForInStatement(ForInStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    super.visitForInStatement(tree);
    nestedLevel--;
  }

  @Override
  public void visitForOfStatement(ForOfStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    super.visitForOfStatement(tree);
    nestedLevel--;
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    super.visitWhileStatement(tree);
    nestedLevel--;
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    super.visitDoWhileStatement(tree);
    nestedLevel--;
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    super.visitSwitchStatement(tree);
    nestedLevel--;
  }

  @Override
  public void visitTryStatement(TryStatementTree tree) {
    nestedLevel++;
    checkNestedLevel(tree);
    super.visitTryStatement(tree);
    nestedLevel--;
  }

  private void checkNestedLevel(Tree tree) {
    if (nestedLevel == getMaximumNestingLevel() + 1) {
      getContext().addIssue(this, tree,
        String.format(MESSAGE, getMaximumNestingLevel()));
    }
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
