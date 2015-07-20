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

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.ast.resolve.type.FunctionTree;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterables;

@Rule(
  key = "FunctionComplexity",
  name = "Functions should not be too complex",
  priority = Priority.MAJOR,
  tags = {Tags.BRAIN_OVERLOAD})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNIT_TESTABILITY)
@SqaleConstantRemediation("1h")
public class FunctionComplexityCheck extends SubscriptionBaseVisitor {

  private static final int DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD = 10;

  @RuleProperty(
    key = "maximumFunctionComplexityThreshold",
    description = "The maximum authorized complexity in function",
    defaultValue = "" + DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD)
  private int maximumFunctionComplexityThreshold = DEFAULT_MAXIMUM_FUNCTION_COMPLEXITY_THRESHOLD;

  private static final Kind[] FUNCTION_KINDS = {
    Kind.FUNCTION_DECLARATION,
    Kind.FUNCTION_EXPRESSION,
    Kind.GENERATOR_FUNCTION_EXPRESSION,
    Kind.GENERATOR_DECLARATION
  };

  private static final Kind[] METHOD_KINDS = {
    Kind.METHOD,
    Kind.GENERATOR_METHOD
  };

  private static final Kind[] ACCESSOR_KINDS = {
    Kind.GET_METHOD,
    Kind.SET_METHOD
  };

  private Deque<Integer> complexityByFunction = new ArrayDeque<>();

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      // Functions
      .add(FUNCTION_KINDS)
      .add(METHOD_KINDS)
      .add(ACCESSOR_KINDS)
      // Branching nodes
      .add(Kind.IF_STATEMENT)
      .add(Kind.DO_WHILE_STATEMENT)
      .add(Kind.WHILE_STATEMENT)
      .add(Kind.FOR_IN_STATEMENT)
      .add(Kind.FOR_OF_STATEMENT)
      .add(Kind.FOR_STATEMENT)
      .add(Kind.CASE_CLAUSE)
      .add(Kind.CATCH_BLOCK)
      .add(Kind.RETURN_STATEMENT)
      .add(Kind.THROW_STATEMENT)
      // Expressions
      .add(Kind.CONDITIONAL_EXPRESSION)
      .add(Kind.CONDITIONAL_AND)
      .add(Kind.CONDITIONAL_OR)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(FUNCTION_KINDS)) {
      complexityByFunction.push(endsWithReturnStatement(((FunctionTree) tree).body()) ? 0 : 1);
    } else if (tree.is(METHOD_KINDS)) {
      complexityByFunction.push(endsWithReturnStatement(((MethodDeclarationTree) tree).body()) ? 0 : 1);
    } else if (tree.is(ACCESSOR_KINDS)) {
      if (endsWithReturnStatement(((MethodDeclarationTree) tree).body())) {
        // An accessor itself counts for 0, and a return should not count for +1 if it is the last statement
        increment(-1);
      }
    } else  {
      increment(1);
    }
  }

  private void increment(int inc) {
    if (!complexityByFunction.isEmpty()) {
      complexityByFunction.push(complexityByFunction.pop() + inc);
    }
  }

  private boolean endsWithReturnStatement(BlockTree body) {
    List<StatementTree> statements = body.statements();
    return !statements.isEmpty() && Iterables.getLast(statements).is(Kind.RETURN_STATEMENT);
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(FUNCTION_KINDS) || tree.is(METHOD_KINDS)) {
      Integer complexity = complexityByFunction.pop();
      if (complexity > maximumFunctionComplexityThreshold) {
        addIssue(tree, String.format(
          "Function has a complexity of %s which is greater than %s authorized.",
          complexity, maximumFunctionComplexityThreshold));
      }
    }
  }

  public void setMaximumFunctionComplexityThreshold(int threshold) {
    this.maximumFunctionComplexityThreshold = threshold;
  }

}
