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

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.implementations.statement.IfStatementTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
import org.sonar.javascript.model.interfaces.statement.ReturnStatementTree;
import org.sonar.squidbridge.annotations.Tags;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "S1126",
  priority = Priority.MINOR,
  tags = {Tags.CLUMSY})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MINOR)
public class ReturnOfBooleanExpressionCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(Kind.IF_STATEMENT);
  }

  @Override
  public void visitNode(AstNode astNode) {
    IfStatementTreeImpl ifStatement = (IfStatementTreeImpl) astNode;

    if (isNotIfElse(ifStatement) && ifStatement.hasElse()
      && returnsBoolean((AstNode) ifStatement.elseClause().statement())
      && returnsBoolean((AstNode) ifStatement.thenStatement())) {
      getContext().createLineViolation(this, "Replace this if-then-else statement by a single return statement.", astNode);
    }
  }

  public static boolean isNotIfElse(IfStatementTreeImpl ifStmt) {
    return !ifStmt.getParent().is(Kind.ELSE_CLAUSE);
  }

  public static boolean returnsBoolean(AstNode statement) {
    return isBlockReturningBooleanLiteral(statement) || isSimpleReturnBooleanLiteral(statement);
  }

  public static boolean isBlockReturningBooleanLiteral(AstNode statement) {
    if (statement.isNot(Kind.BLOCK)) {
      return false;
    }

    BlockTree block =  (BlockTree) statement;


    return block.statements().size() == 1 && isSimpleReturnBooleanLiteral((AstNode) block.statements().get(0));
  }

  public static boolean isSimpleReturnBooleanLiteral(AstNode astNode) {
    if (astNode.isNot(Kind.RETURN_STATEMENT)) {
      return false;
    }

    ReturnStatementTree statement = (ReturnStatementTree) astNode;
    ExpressionTree expression = statement.expression();
    return expression != null && expression.is(Kind.BOOLEAN_LITERAL);
  }

}
