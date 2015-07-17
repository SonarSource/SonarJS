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

import com.google.common.collect.ImmutableList;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

@Rule(
  key = "UnreachableCode",
  name = "Jump statements should not be followed by other statements",
  priority = Priority.MAJOR,
  tags = {Tags.CERT, Tags.CWE, Tags.MISRA, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5 min")
public class UnreachableCodeCheck extends SubscriptionBaseVisitor {

  private Deque<Boolean> blockLevel = new ArrayDeque<>();
  private static final Kind[] JUMP_STATEMENT = {
    Kind.BREAK_STATEMENT,
    Kind.RETURN_STATEMENT,
    Kind.CONTINUE_STATEMENT,
    Kind.THROW_STATEMENT
  };
  private static final Kind[] STATEMENTS = {
    Kind.EXPRESSION_STATEMENT,
    Kind.IF_STATEMENT,
    Kind.FOR_STATEMENT,
    Kind.FOR_IN_STATEMENT,
    Kind.FOR_OF_STATEMENT,
    Kind.WITH_STATEMENT,
    Kind.SWITCH_STATEMENT,
    Kind.THROW_STATEMENT,
    Kind.TRY_STATEMENT,
    Kind.DEBUGGER_STATEMENT,
    Kind.VARIABLE_STATEMENT
  };


  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      .add(JUMP_STATEMENT)
      .add(STATEMENTS)
      .add(Kind.BLOCK, Kind.CASE_CLAUSE, Kind.DEFAULT_CLAUSE, Kind.ELSE_CLAUSE)
      .build();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    blockLevel.clear();
    enterBlock();
  }


  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.BLOCK) || isScopeWithoutBlock(tree)) {
      enterBlock();

    } else if (!isExcludedExpression(tree) && isPreeceedByAJump()) {
      getContext().addIssue(this, tree, "This statement can't be reached and so start a dead code block.");
      updateStateTo(false);
    }

    if (tree.is(JUMP_STATEMENT)) {
      updateStateTo(true);
    }
  }

  private static boolean isScopeWithoutBlock(Tree tree) {
    if (tree.is(CheckUtils.iterationStatementsArray())) {
      return !((IterationStatementTree) tree).statement().is(Kind.BLOCK);

    } else if (tree.is(Kind.IF_STATEMENT)) {
      return !((IfStatementTree) tree).statement().is(Kind.BLOCK);

    } else if (tree.is(Kind.ELSE_CLAUSE)) {
      return !((ElseClauseTree) tree).statement().is(Kind.BLOCK);

    } else {
      return tree.is(Kind.CASE_CLAUSE, Kind.DEFAULT_CLAUSE);
    }
  }

  private static boolean isExcludedExpression(Tree tree) {
    return tree.is(Kind.EXPRESSION_STATEMENT)
      && ((ExpressionStatementTree) tree).expression().is(Kind.CLASS_EXPRESSION);
  }

  private void updateStateTo(Boolean state) {
    blockLevel.pop();
    blockLevel.push(state);
  }

  private Boolean isPreeceedByAJump() {
    return blockLevel.peek();
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(Kind.BLOCK) || isScopeWithoutBlock(tree)) {
      exitBlock();
    }
  }

  private void enterBlock() {
    blockLevel.push(false);
  }

  private void exitBlock() {
    blockLevel.pop();
  }

}
