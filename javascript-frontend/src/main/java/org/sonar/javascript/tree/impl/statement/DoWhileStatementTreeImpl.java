/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.tree.impl.statement;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class DoWhileStatementTreeImpl extends JavaScriptTree implements DoWhileStatementTree {

  private final SyntaxToken doKeyword;
  private final StatementTree statement;
  private final SyntaxToken whileKeyword;
  private final SyntaxToken openingParenthesis;
  private final ExpressionTree condition;
  private final SyntaxToken closingParenthesis;
  private final SyntaxToken semicolonToken;

  public DoWhileStatementTreeImpl(
    InternalSyntaxToken doKeyword, StatementTree statement, InternalSyntaxToken whileKeyword, InternalSyntaxToken openingParenthesis,
    ExpressionTree condition, InternalSyntaxToken closingParenthesis, SyntaxToken semicolonToken
  ) {
    this.doKeyword = doKeyword;
    this.statement = statement;
    this.whileKeyword = whileKeyword;
    this.openingParenthesis = openingParenthesis;
    this.condition = condition;
    this.closingParenthesis = closingParenthesis;
    this.semicolonToken = semicolonToken;

  }

  @Override
  public SyntaxToken doKeyword() {

    return doKeyword;
  }

  @Override
  public StatementTree statement() {
    return statement;
  }

  @Override
  public SyntaxToken whileKeyword() {
    return whileKeyword;
  }

  @Override
  public SyntaxToken openParenthesisToken() {
    return openingParenthesis;
  }

  @Override
  public ExpressionTree condition() {
    return condition;
  }

  @Override
  public SyntaxToken closeParenthesisToken() {
    return closingParenthesis;
  }

  @Nullable
  @Override
  public SyntaxToken semicolonToken() {
    return semicolonToken;
  }

  @Override
  public Kind getKind() {
    return Kind.DO_WHILE_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(
      doKeyword,
      statement,
      whileKeyword,
      openingParenthesis,
      condition,
      closingParenthesis,
      semicolonToken
    );
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitDoWhileStatement(this);
  }
}
