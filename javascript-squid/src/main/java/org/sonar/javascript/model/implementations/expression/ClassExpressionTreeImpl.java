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
package org.sonar.javascript.model.implementations.expression;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.DeclarationTree;
import org.sonar.javascript.model.interfaces.expression.ClassExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.StatementTree;

import java.util.Iterator;

public class ClassExpressionTreeImpl extends JavaScriptTree implements ClassExpressionTree {

  private final InternalSyntaxToken classKeyword;
  private final IdentifierTreeImpl name;

  public ClassExpressionTreeImpl(InternalSyntaxToken classKeyword, IdentifierTreeImpl name, ImmutableList<AstNode> children) {
    super(Kind.CLASS_EXPRESSION);
    this.classKeyword = classKeyword;
    this.name = name;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  public ClassExpressionTreeImpl(InternalSyntaxToken classKeyword, ImmutableList<AstNode> children) {
    super(Kind.CLASS_EXPRESSION);
    this.classKeyword = classKeyword;
    this.name = null;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  @Override
  public SyntaxToken classKeyword() {
    return classKeyword;
  }

  @Override
  public IdentifierTree name() {
    return name;
  }

  @Override
  public DeclarationTree heritage() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public StatementTree body() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Kind getKind() {
    return Kind.CLASS_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }

}
