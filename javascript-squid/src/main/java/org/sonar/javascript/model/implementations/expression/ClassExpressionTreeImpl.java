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

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.expression.ClassExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;

import java.util.Iterator;
import java.util.List;

public class ClassExpressionTreeImpl extends JavaScriptTree implements ClassExpressionTree {

  private final InternalSyntaxToken classToken;
  private final IdentifierTreeImpl name;
  private final InternalSyntaxToken extendsToken;
  private final ExpressionTree superClass;
  private final InternalSyntaxToken openCurlyBraceToken;
  private final InternalSyntaxToken closeCurlyBraceToken;

  public ClassExpressionTreeImpl(InternalSyntaxToken classToken, @Nullable IdentifierTreeImpl name,
    @Nullable InternalSyntaxToken extendsToken, @Nullable ExpressionTree superClass,
    InternalSyntaxToken openCurlyBraceToken, List<AstNode> elements, InternalSyntaxToken closeCurlyBraceToken) {

    super(Kind.CLASS_EXPRESSION);

    this.classToken = classToken;
    this.name = name;
    this.extendsToken = extendsToken;
    this.superClass = superClass;
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.closeCurlyBraceToken = closeCurlyBraceToken;

    addChild(classToken);
    addChild(name);
    addChild(extendsToken);
    addChild((AstNode) superClass);
    addChild(openCurlyBraceToken);
    for (AstNode element : elements) {
      addChild(element);
    }
    addChild(closeCurlyBraceToken);
  }

  @Override
  public SyntaxToken classToken() {
    return classToken;
  }

  @Override
  public IdentifierTree name() {
    return name;
  }

  @Override
  public SyntaxToken extendsToken() {
    return extendsToken;
  }

  @Override
  @Nullable
  public ExpressionTree superClass() {
    return superClass;
  }

  @Override
  public SyntaxToken openCurlyBraceToken() {
    return openCurlyBraceToken;
  }

  @Override
  public List<MethodDeclarationTree> members() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return closeCurlyBraceToken;
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
