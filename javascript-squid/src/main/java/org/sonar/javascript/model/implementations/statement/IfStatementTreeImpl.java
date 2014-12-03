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

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.ElseClauseTree;
import org.sonar.javascript.model.interfaces.statement.IfStatementTree;
import org.sonar.javascript.model.interfaces.statement.StatementTree;

import javax.annotation.Nullable;
import java.util.Iterator;

public class IfStatementTreeImpl extends JavaScriptTree implements IfStatementTree {

  private SyntaxToken ifKeyword;
  private SyntaxToken openParenthesis;
  private SyntaxToken closeParenthesis;
  private ElseClauseTree elseClause;

  public IfStatementTreeImpl(InternalSyntaxToken ifKeyword, InternalSyntaxToken openParenthesis, AstNode condition, InternalSyntaxToken closeParenthesis, AstNode statement) {
    super(Kind.IF_STATEMENT);
    this.ifKeyword = ifKeyword;
    this.openParenthesis = openParenthesis;
    this.closeParenthesis = closeParenthesis;

    addChildren(ifKeyword, openParenthesis, condition, closeParenthesis, statement);
  }

  public IfStatementTreeImpl(InternalSyntaxToken ifKeyword, InternalSyntaxToken openParenthesis, AstNode condition, InternalSyntaxToken closeParenthesis, AstNode statement, ElseClauseTreeImpl elseClause) {
    super(Kind.IF_STATEMENT);
    this.ifKeyword = ifKeyword;
    this.openParenthesis = openParenthesis;
    this.closeParenthesis = closeParenthesis;
    this.elseClause = elseClause;

    addChildren(ifKeyword, openParenthesis, condition, closeParenthesis, statement, elseClause);
  }

  @Override
  public SyntaxToken ifKeyword() {
    return ifKeyword;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Override
  public ExpressionTree condition() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public SyntaxToken closeParenthesis() {
    return closeParenthesis;
  }

  @Override
  public StatementTree thenStatement() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Nullable
  @Override
  public ElseClauseTree elseClause() {
     return elseClause;
  }

  public boolean hasElse() {
    return elseClause != null;
  }
  @Override
  public AstNodeType getKind() {
    return Kind.IF_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }

}
