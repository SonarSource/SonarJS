/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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

import javax.annotation.Nullable;

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.JavaScriptFileScanner;
import org.sonar.javascript.ast.visitors.AstTreeVisitorContext;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.SyntacticEquivalence;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.statement.CaseClauseTree;
import org.sonar.javascript.model.interfaces.statement.ElseClauseTree;
import org.sonar.javascript.model.interfaces.statement.IfStatementTree;
import org.sonar.javascript.model.interfaces.statement.SwitchClauseTree;
import org.sonar.javascript.model.interfaces.statement.SwitchStatementTree;
import org.sonar.squidbridge.annotations.Tags;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "S1862",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.CERT, Tags.PITFALL, Tags.UNUSED})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class DuplicateConditionIfElseAndSwitchCasesCheck extends BaseTreeVisitor {

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    ExpressionTree condition = tree.condition();
    ElseClauseTree elseClause = tree.elseClause();

    while (elseClause != null && elseClause.statement().is(Tree.Kind.IF_STATEMENT)) {
      IfStatementTree ifStatement = (IfStatementTree) elseClause.statement();

      if (SyntacticEquivalence.areEquivalent(condition, ifStatement.condition())) {
        getContext().addIssue(this,
          ifStatement.condition(),
          "This branch duplicates the one on line " + ((AstNode) condition).getTokenLine() + ".");
      }
      elseClause = ifStatement.elseClause();
    }

    super.visitIfStatement(tree);
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    for (int i = 0; i < tree.cases().size(); i++) {
      for (int j = i + 1; j < tree.cases().size(); j++) {
        ExpressionTree condition = getCondition(tree.cases().get(i));
        ExpressionTree conditionToCompare = getCondition(tree.cases().get(j));

        if (SyntacticEquivalence.areEquivalent(condition, conditionToCompare)) {
          getContext().addIssue(this,
            conditionToCompare,
            "This case duplicates the one on line " + ((AstNode) condition).getTokenLine() + ".");
        }
      }
    }
  }

  /**
   * Returns null is case is default, the case expression otherwise.
   */
  @Nullable
  private ExpressionTree getCondition(SwitchClauseTree clause) {
    return clause.is(Kind.CASE_CLAUSE) ? ((CaseClauseTree) clause).expression() : null;
  }

}
