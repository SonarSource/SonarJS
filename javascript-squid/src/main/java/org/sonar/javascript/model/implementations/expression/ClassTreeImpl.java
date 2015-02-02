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

import java.util.Iterator;
import java.util.List;

import javax.annotation.Nullable;

import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.expression.ClassTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;

public class ClassTreeImpl extends JavaScriptTree implements ClassTree {

  private InternalSyntaxToken classToken;
  @Nullable
  private IdentifierTreeImpl name;
  @Nullable
  private InternalSyntaxToken extendsToken;
  @Nullable
  private ExpressionTree superClass;
  private InternalSyntaxToken openCurlyBraceToken;
  private final List<MethodDeclarationTree> elements;
  private final List<SyntaxToken> semicolons;
  private InternalSyntaxToken closeCurlyBraceToken;
  private final Kind kind;

  private ClassTreeImpl(Kind kind, InternalSyntaxToken classToken, @Nullable IdentifierTreeImpl name,
    @Nullable InternalSyntaxToken extendsToken, @Nullable ExpressionTree superClass,
    InternalSyntaxToken openCurlyBraceToken, List<MethodDeclarationTree> elements,
    List<SyntaxToken> semicolons, List<AstNode> elementsChildren, InternalSyntaxToken closeCurlyBraceToken) {

    super(kind);
    this.kind = kind;

    this.classToken = classToken;
    this.name = name;
    this.extendsToken = extendsToken;
    this.superClass = superClass;
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.elements = elements;
    this.semicolons = semicolons;
    this.closeCurlyBraceToken = closeCurlyBraceToken;

    addChildren(classToken, name, extendsToken, (AstNode) superClass, openCurlyBraceToken);
    for (AstNode child : elementsChildren) {
      addChild(child);
    }
    addChild(closeCurlyBraceToken);
  }

  public static ClassTreeImpl newClassExpression(InternalSyntaxToken classToken, @Nullable IdentifierTreeImpl name,
    @Nullable InternalSyntaxToken extendsToken, @Nullable ExpressionTree superClass, InternalSyntaxToken openCurlyBraceToken,
    List<MethodDeclarationTree> elements, List<SyntaxToken> semicolons, InternalSyntaxToken closeCurlyBraceToken, List<AstNode> elementsChildren) {

    return new ClassTreeImpl(Kind.CLASS_EXPRESSION, classToken, name, extendsToken, superClass, openCurlyBraceToken, elements, semicolons, elementsChildren, closeCurlyBraceToken);
  }

  public static ClassTreeImpl newClassDeclaration(InternalSyntaxToken classToken, @Nullable IdentifierTreeImpl name,
    @Nullable InternalSyntaxToken extendsToken, @Nullable ExpressionTree superClass, InternalSyntaxToken openCurlyBraceToken,
    List<MethodDeclarationTree> elements, List<SyntaxToken> semicolons, InternalSyntaxToken closeCurlyBraceToken, List<AstNode> elementsChildren ) {

    return new ClassTreeImpl(Kind.CLASS_DECLARATION, classToken, name, extendsToken, superClass, openCurlyBraceToken, elements, semicolons, elementsChildren, closeCurlyBraceToken);
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
  @Nullable
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
  public List<MethodDeclarationTree> elements() {
    return elements;
  }

  @Override
  public List<SyntaxToken> semicolons() {
    return semicolons;
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return closeCurlyBraceToken;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(superClass),
      elements.iterator());
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitClassDeclaration(this);
  }
}
