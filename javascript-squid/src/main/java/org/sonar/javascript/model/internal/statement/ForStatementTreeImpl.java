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
package org.sonar.javascript.model.internal.statement;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;

import javax.annotation.Nullable;

import java.util.Iterator;
import java.util.List;

public class ForStatementTreeImpl extends JavaScriptTree implements ForStatementTree {

  private final SyntaxToken forKeyword;
  private final SyntaxToken openParenthesis;
  private final Tree init;
  private final SyntaxToken firstSemicolon;
  private final ExpressionTree condition;
  private final SyntaxToken secondSemicolon;
  private final ExpressionTree update;
  private final SyntaxToken closeParenthesis;
  private final StatementTree statement;

  public ForStatementTreeImpl(
    InternalSyntaxToken forKeyword,
    InternalSyntaxToken openParenthesis,
    @Nullable Tree init,
    InternalSyntaxToken firstSemicolon,
    @Nullable ExpressionTree condition, InternalSyntaxToken secondSemicolon,
    @Nullable ExpressionTree update, InternalSyntaxToken closeParenthesis,
    StatementTree statement,
    List<AstNode> children) {

    super(Kind.FOR_STATEMENT);
    this.forKeyword = forKeyword;
    this.openParenthesis = openParenthesis;
    this.init = init;
    this.firstSemicolon = firstSemicolon;
    this.condition = condition;
    this.secondSemicolon = secondSemicolon;
    this.update = update;
    this.closeParenthesis = closeParenthesis;
    this.statement = statement;

    addChildren(children.toArray(new AstNode[children.size()]));
  }

  @Override
  public SyntaxToken forKeyword() {
    return forKeyword;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Nullable
  @Override
  public Tree init() {
    return init;
  }

  @Override
  public SyntaxToken firstSemicolon() {
    return firstSemicolon;
  }

  @Nullable
  @Override
  public ExpressionTree condition() {
    return condition;
  }

  @Override
  public SyntaxToken secondSemicolon() {
    return secondSemicolon;
  }

  @Nullable
  @Override
  public ExpressionTree update() {
    return update;
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
  public AstNodeType getKind() {
    return Kind.FOR_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(init, condition, update, statement);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitForStatement(this);
  }
}
