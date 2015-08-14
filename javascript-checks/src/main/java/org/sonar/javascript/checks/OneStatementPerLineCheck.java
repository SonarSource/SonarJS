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
import com.google.common.collect.Maps;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.SubscriptionBaseVisitor;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;
import java.util.Map;

@Rule(
  key = "OneStatementPerLine",
  name = "Statements should be on separate lines",
  priority = Priority.MINOR,
  tags = {Tags.CONVENTION})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("1min")
public class OneStatementPerLineCheck extends SubscriptionBaseVisitor {

  private final Map<Integer, Integer> statementsPerLine = Maps.newHashMap();
  private static final String MESSAGE = "At most one statement is allowed per line, but %s statements were found on this line.";

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
        Kind.VARIABLE_STATEMENT,
        Kind.EXPRESSION_STATEMENT,
        Kind.IF_STATEMENT,
        Kind.DO_WHILE_STATEMENT,
        Kind.WHILE_STATEMENT,
        Kind.FOR_IN_STATEMENT,
        Kind.FOR_OF_STATEMENT,
        Kind.FOR_STATEMENT,
        Kind.CONTINUE_STATEMENT,
        Kind.BREAK_STATEMENT,
        Kind.RETURN_STATEMENT,
        Kind.WITH_STATEMENT,
        Kind.SWITCH_STATEMENT,
        Kind.THROW_STATEMENT,
        Kind.TRY_STATEMENT,
        Kind.DEBUGGER_STATEMENT,
        Kind.FUNCTION_EXPRESSION,
        Kind.SCRIPT);
  }

  @Override
  public void visitFile(Tree scriptTree) {
    statementsPerLine.clear();
  }

  @Override
  public void visitNode(Tree tree) {

    int line = ((JavaScriptTree) tree).getLine();

    // Exception - if function expression has 1 statement in the same line as declaration, ignore this case.
    if (tree.is(Kind.FUNCTION_EXPRESSION) && isFunctionExpressionException((FunctionExpressionTree)tree)){
      statementsPerLine.put(line, statementsPerLine.get(line) - 1);
    }

    if (tree.is(Kind.SCRIPT, Kind.FUNCTION_EXPRESSION)){
      return;
    }

    if (!statementsPerLine.containsKey(line)) {
      statementsPerLine.put(line, 0);
    }
    statementsPerLine.put(line, statementsPerLine.get(line) + 1);
  }

  private boolean isFunctionExpressionException(FunctionExpressionTree functionExpressionTree){
    int line = ((JavaScriptTree) functionExpressionTree).getLine();
    List<StatementTree> statements = functionExpressionTree.body().statements();
    return statements.size() == 1 && ((JavaScriptTree)statements.get(0)).getLine() == line && statementsPerLine.containsKey(line);
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)){
      for (Map.Entry<Integer, Integer> statementsAtLine : statementsPerLine.entrySet()) {
        if (statementsAtLine.getValue() > 1) {
          getContext().addIssue(this, statementsAtLine.getKey(), String.format(MESSAGE, statementsAtLine.getValue()));
        }
      }
    }
  }
}
