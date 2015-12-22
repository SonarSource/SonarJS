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
package org.sonar.javascript.tree.impl.statement;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

public class ForInStatementTreeImpl extends JavaScriptTree implements ForInStatementTree {

  private final SyntaxToken forKeyword;
  private final SyntaxToken openParenthesis;
  private final Tree variableOrExpression;
  private final SyntaxToken inKeyword;
  private final ExpressionTree expression;
  private final SyntaxToken closeParenthesis;
  private final StatementTree statement;

  public ForInStatementTreeImpl(
    InternalSyntaxToken forKeyword, InternalSyntaxToken openParenthesis, Tree variableOrExpression,
    InternalSyntaxToken inKeyword, ExpressionTree expression, InternalSyntaxToken closeParenthesis, StatementTree statement
  ) {

    this.forKeyword = forKeyword;
    this.openParenthesis = openParenthesis;
    this.variableOrExpression = variableOrExpression;
    this.inKeyword = inKeyword;
    this.expression = expression;
    this.closeParenthesis = closeParenthesis;
    this.statement = statement;

  }

  @Override
  public SyntaxToken forKeyword() {
    return forKeyword;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Override
  public Tree variableOrExpression() {
    return variableOrExpression;
  }

  @Override
  public SyntaxToken inKeyword() {
    return inKeyword;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Override
  public SyntaxToken closeParenthesis() {
    return closeParenthesis;
  }

  @Override
  public StatementTree statement() {
    return statement;
  }

  @Override
  public Kind getKind() {
    return Kind.FOR_IN_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(forKeyword, openParenthesis, variableOrExpression, inKeyword, expression, closeParenthesis, statement);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitForInStatement(this);
  }
}
