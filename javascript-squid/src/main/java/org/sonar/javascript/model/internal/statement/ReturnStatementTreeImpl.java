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

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;

import javax.annotation.Nullable;

import java.util.Iterator;

public class ReturnStatementTreeImpl extends JavaScriptTree implements ReturnStatementTree {

  private SyntaxToken returnKeyword;
  private ExpressionTree expression;

  public ReturnStatementTreeImpl(AstNode eos) {
    super(Kind.RETURN_STATEMENT);

    addChild(eos);
  }

  public ReturnStatementTreeImpl(ExpressionTree expression, AstNode eos) {
    super(Kind.RETURN_STATEMENT);

    this.expression = expression;

    addChild((AstNode) expression);
    addChild(eos);
  }

  public ReturnStatementTreeImpl complete(InternalSyntaxToken returnKeyword) {
    Preconditions.checkState(this.returnKeyword == null, "Already completed");
    this.returnKeyword = returnKeyword;

    prependChildren(returnKeyword);
    return this;
  }

  @Override
  public Kind getKind() {
    return Kind.RETURN_STATEMENT;
  }

  @Override
  public SyntaxToken returnKeyword() {
    return returnKeyword;
  }

  @Nullable
  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Nullable
  @Override
  public Tree endOfStatement() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(expression);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitReturnStatement(this);
  }
}
