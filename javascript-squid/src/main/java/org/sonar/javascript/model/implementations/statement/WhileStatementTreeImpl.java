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
package org.sonar.javascript.model.implementations.statement;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.StatementTree;
import org.sonar.javascript.model.interfaces.statement.WhileStatementTree;

import java.util.Iterator;

public class WhileStatementTreeImpl extends JavaScriptTree implements WhileStatementTree {

  private final SyntaxToken whileKeyword;
  private final SyntaxToken openingParenthesis;
  private final SyntaxToken closingParenthesis;

  public WhileStatementTreeImpl(InternalSyntaxToken whileKeyword, InternalSyntaxToken openingParenthesis, AstNode condition, InternalSyntaxToken closingParenthesis, AstNode statement) {
    super(Kind.WHILE_STATEMENT);
    this.whileKeyword = whileKeyword;
    this.openingParenthesis = openingParenthesis;
    this.closingParenthesis = closingParenthesis;

    addChildren(whileKeyword, openingParenthesis, condition, closingParenthesis, statement);
  }

  @Override
  public SyntaxToken whileKeyword() {
    return whileKeyword;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openingParenthesis;
  }

  @Override
  public ExpressionTree condition() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public SyntaxToken closeParenthesis() {
    return closingParenthesis;
  }

  @Override
  public StatementTree statement() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public AstNodeType getKind() {
    return Kind.WHILE_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }
}
