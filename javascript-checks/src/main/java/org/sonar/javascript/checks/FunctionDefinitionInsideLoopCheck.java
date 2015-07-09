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

import java.util.List;
import java.util.Stack;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.collect.ImmutableList;

@Rule(
  key = "FunctionDefinitionInsideLoop",
  name = "Functions should not be defined inside loops",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("30min")
public class FunctionDefinitionInsideLoopCheck extends SubscriptionBaseVisitor {

  private Stack<Boolean> scope = new Stack<>();

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      .add(CheckUtils.iterationStatementsArray())
      .add(Kind.FUNCTION_EXPRESSION,
        Kind.FUNCTION_DECLARATION,
        Kind.GENERATOR_FUNCTION_EXPRESSION,
        Kind.GENERATOR_DECLARATION)
      .build();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    scope.clear();
    scope.push(false);
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree instanceof IterationStatementTree) {
      setScopeStateInLoop(true);

    } else {
      if (isInLoop()) {
        getContext().addIssue(this, tree, "Define this function outside of a loop.");
      }
      enterScope();
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree instanceof IterationStatementTree) {
      setScopeStateInLoop(false);

    } else {
      scope.pop();
    }
  }

  private void enterScope() {
    scope.push(false);
  }

  private void setScopeStateInLoop(Boolean isInLoop) {
    scope.pop();
    scope.push(isInLoop);
  }

  public boolean isInLoop() {
    return scope.peek();
  }
}
