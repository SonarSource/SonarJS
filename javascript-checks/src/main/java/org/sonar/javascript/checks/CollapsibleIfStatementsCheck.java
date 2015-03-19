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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.implementations.statement.IfStatementTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
import org.sonar.javascript.model.interfaces.statement.StatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "CollapsibleIfStatements",
  name = "Collapsible \"if\" statements should be merged",
  priority = Priority.MAJOR,
  tags = {Tags.CLUMSY})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("30min")
public class CollapsibleIfStatementsCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(Kind.IF_STATEMENT);
  }

  @Override
  public void visitNode(AstNode node) {
    IfStatementTreeImpl ifStatement = (IfStatementTreeImpl) node;

    if (!ifStatement.hasElse()) {
      StatementTree innerStatement = ifStatement.thenStatement();

      if (isBlockAndContainsOnlyOneIfStatement((AstNode) innerStatement) || isIfStatementWithoutElse(innerStatement)) {
        getContext().createLineViolation(this, "Merge this if statement with the nested one.", node);
      }
    }
  }

  private boolean isBlockAndContainsOnlyOneIfStatement(AstNode statement) {
    if (!statement.is(Kind.BLOCK)) {
      return false;
    }
    BlockTree block = (BlockTree) statement;

    return block.statements().size() == 1 ? isIfStatementWithoutElse(block.statements().get(0)) : false;
  }

  private boolean isIfStatementWithoutElse(StatementTree statement) {
    return statement.is(Kind.IF_STATEMENT) && !((IfStatementTreeImpl) statement).hasElse();
  }

}
