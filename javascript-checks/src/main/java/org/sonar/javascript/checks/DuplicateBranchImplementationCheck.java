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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterables;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.SyntacticEquivalence;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S1871",
  name = "Two branches in the same conditional structure should not have exactly the same implementation",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("10min")
public class DuplicateBranchImplementationCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Either merge this %s with the identical one on line \"%s\" or change one of the implementations.";
  private static final String CONDITIONAL_EXPRESSION_MESSAGE = "This conditional operation returns the same value whether the condition is \"true\" or \"false\".";

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    StatementTree implementation = tree.statement();
    ElseClauseTree elseClause = tree.elseClause();

    while (elseClause != null) {
      StatementTree implementationToCompare = getImplementationFromElseClause(elseClause);

      if (SyntacticEquivalence.areEquivalent(implementation, implementationToCompare)) {
        addIssue(implementation, implementationToCompare, "branch");
        break;
      }
      elseClause = getNextElse(elseClause);
    }

    super.visitIfStatement(tree);
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    for (int i = 0; i < tree.cases().size(); i++) {
      SwitchClauseTree caseTree = tree.cases().get(i);

      // FIXME martin: Don't check duplication for case with fall through on the next case.
      if (caseTree.statements().isEmpty() || isCaseEndingWithoutJumpStmt(caseTree)) {
        continue;
      }

      compareWithNextCases(tree, i, caseTree);
    }
  }

  private void compareWithNextCases(SwitchStatementTree tree, int indexCaseReference, SwitchClauseTree caseTree) {
    for (int j = indexCaseReference + 1; j < tree.cases().size(); j++) {
      SwitchClauseTree caseTreeToCompare = tree.cases().get(j);

      // FIXME martin: Don't check duplication for case with fall through on the next case.
      if (caseTreeToCompare.statements().isEmpty() || isCaseEndingWithoutJumpStmt(caseTreeToCompare)) {
        continue;
      }

      // Remove the jump statement if comparing to default case
      List<StatementTree> caseStatements = caseTreeToCompare.is(Kind.DEFAULT_CLAUSE) ? caseTree.statements().subList(0, caseTree.statements().size() - 1) : caseTree.statements();

      if (SyntacticEquivalence.areEquivalent(caseStatements, caseTreeToCompare.statements())) {
        addIssue(caseTree, caseTreeToCompare, "case");
        // break the inner loop
        break;
      }
    }
  }

  private void addIssue(Tree original, Tree duplicate, String type) {
    IssueLocation secondary = new IssueLocation(original, "Original");
    String message = String.format(MESSAGE, type, secondary.startLine());
    getContext().addIssue(this, new IssueLocation(duplicate, message), ImmutableList.of(secondary), null);
  }

  private boolean isCaseEndingWithoutJumpStmt(SwitchClauseTree caseTree) {
    return caseTree.is(Kind.CASE_CLAUSE) && !isJumpStatement(Iterables.getLast(caseTree.statements()));
  }

  private static boolean isJumpStatement(StatementTree statement) {
    return statement.is(
      Kind.BREAK_STATEMENT,
      Kind.RETURN_STATEMENT,
      Kind.CONTINUE_STATEMENT,
      Kind.THROW_STATEMENT);
  }

  private static StatementTree getImplementationFromElseClause(ElseClauseTree elseClause) {
    return elseClause.statement().is(Kind.IF_STATEMENT) ? ((IfStatementTree) elseClause.statement()).statement() : elseClause.statement();
  }

  public ElseClauseTree getNextElse(ElseClauseTree elseClause) {
    return elseClause.statement().is(Kind.IF_STATEMENT) ? ((IfStatementTree) elseClause.statement()).elseClause() : null;
  }

  @Override
  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    if (SyntacticEquivalence.areEquivalent(tree.trueExpression(), tree.falseExpression())) {
      List<IssueLocation> secondaryLocations = ImmutableList.of(
        new IssueLocation(tree.trueExpression()),
        new IssueLocation(tree.falseExpression()));
      getContext().addIssue(this, new IssueLocation(tree.query(), CONDITIONAL_EXPRESSION_MESSAGE), secondaryLocations, null);
    }
    super.visitConditionalExpression(tree);
  }
}
