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
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "CurlyBraces",
  name = "Control structures should always use curly braces",
  priority = Priority.MAJOR,
  tags = {Tags.CERT, Tags.CWE, Tags.MISRA, Tags.PITFALL})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("2min")
public class AlwaysUseCurlyBracesCheck extends SubscriptionBaseTreeVisitor {

  private static final String MESSAGE = "Add curly braces around the nested statement(s) in this \"%s\" block.";

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.<Kind>builder()
      .add(Kind.IF_STATEMENT)
      .add(Kind.ELSE_CLAUSE)
      .add(Kind.FOR_IN_STATEMENT)
      .add(Kind.FOR_STATEMENT)
      .add(Kind.WHILE_STATEMENT)
      .add(Kind.DO_WHILE_STATEMENT)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.ELSE_CLAUSE)) {
      visitElseClause(tree);
    } else if (tree.is(Kind.IF_STATEMENT)) {
      checkAreCurlyBracesUsed(((IfStatementTree) tree).statement(), tree);
    } else {
      checkAreCurlyBracesUsed(((IterationStatementTree) tree).statement(), tree);
    }
  }

  private void visitElseClause(Tree tree) {
    if (!((ElseClauseTree) tree).statement().is(Kind.IF_STATEMENT)) {
      checkAreCurlyBracesUsed(((ElseClauseTree) tree).statement(), tree);
    }
  }

  private void checkAreCurlyBracesUsed(StatementTree statement, Tree tree) {
    if (!statement.is(Kind.BLOCK)) {
      String blockName = ((JavaScriptTree) tree).getFirstToken().text();
      getContext().addIssue(this, tree, String.format(MESSAGE, blockName));
    }
  }

}
