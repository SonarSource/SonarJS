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

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.ListMultimap;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "OneStatementPerLine")
public class OneStatementPerLineCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Reformat the code to have only one statement per line.";

  private ListMultimap<Integer, StatementTree> statementsPerLine = ArrayListMultimap.create();
  private List<StatementTree> excludedStatements = new ArrayList<>();

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(
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
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      Kind.ARROW_FUNCTION,
      Kind.SCRIPT);
  }

  @Override
  public void visitFile(Tree scriptTree) {
    statementsPerLine.clear();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.IF_STATEMENT)) {
      checkForExcludedStatement(((IfStatementTree) tree).statement(), tree);
    }

    if (tree.is(KindSet.LOOP_KINDS)) {
      checkForExcludedStatement(((IterationStatementTree) tree).statement(), tree);
    }

    if (tree.is(Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION, Kind.ARROW_FUNCTION)){
      checkFunctionException((FunctionTree)tree);
    }

    if (!tree.is(Kind.SCRIPT, Kind.FUNCTION_EXPRESSION, Kind.GENERATOR_FUNCTION_EXPRESSION, Kind.ARROW_FUNCTION) && !excludedStatements.contains(tree)){
      statementsPerLine.put(((JavaScriptTree) tree).getLine(), (StatementTree) tree);
    }
  }

  private void checkForExcludedStatement(StatementTree nestedStatement, Tree statement) {
    int statementLine = ((JavaScriptTree) statement).getLine();

    if (nestedStatement.is(Kind.BLOCK)) {
      BlockTree blockTree = (BlockTree) nestedStatement;
      if (blockTree.closeCurlyBrace().line() == statementLine && blockTree.statements().size() == 1) {
        excludedStatements.add(blockTree.statements().get(0));
      }
    } else {
      int nestedStatementLine = ((JavaScriptTree) nestedStatement).getLine();

      if (nestedStatementLine == statementLine) {
        excludedStatements.add(nestedStatement);
      }
    }
  }

  // Exception - if function expression has 1 statement in the same line as declaration, ignore this case.
  private void checkFunctionException(FunctionTree functionTree){
    if (!functionTree.body().is(Kind.BLOCK)) {
      return;
    }

    int line = ((JavaScriptTree) functionTree).getLine();
    List<StatementTree> statements = ((BlockTree) functionTree.body()).statements();
    if (statements.size() == 1 && ((JavaScriptTree)statements.get(0)).getLine() == line && statementsPerLine.containsKey(line)) {
      excludedStatements.add(statements.get(0));
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)){
      for (int line : statementsPerLine.keys().elementSet()) {
        List<StatementTree> statementsAtLine = statementsPerLine.get(line);

        if (statementsAtLine.size() > 1) {
          addIssue(statementsAtLine);
        }
      }

      excludedStatements.clear();
    }
  }

  private void addIssue(List<StatementTree> statementsAtLine) {
    PreciseIssue issue = addIssue(statementsAtLine.get(1), MESSAGE);

    for (int i = 2; i < statementsAtLine.size(); i++) {
      issue.secondary(new IssueLocation(statementsAtLine.get(i)));
    }
  }
}
