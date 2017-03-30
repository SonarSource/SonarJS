/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.collect.Iterables;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.ClassType;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ClassTreeImpl extends JavaScriptTree implements ClassTree, TypableTree {

  private List<DecoratorTree> decorators;
  private InternalSyntaxToken classToken;
  @Nullable
  private IdentifierTree name;
  @Nullable
  private InternalSyntaxToken extendsToken;
  @Nullable
  private ExpressionTree superClass;
  private InternalSyntaxToken openCurlyBraceToken;
  private final List<Tree> elements;
  private InternalSyntaxToken closeCurlyBraceToken;
  private final Kind kind;
  private ClassType classType;

  private ClassTreeImpl(
    Kind kind, List<DecoratorTree> decorators, InternalSyntaxToken classToken, @Nullable IdentifierTree name,
    @Nullable InternalSyntaxToken extendsToken, @Nullable ExpressionTree superClass,
    InternalSyntaxToken openCurlyBraceToken, List<Tree> elements, InternalSyntaxToken closeCurlyBraceToken
  ) {

    this.kind = kind;

    this.decorators = decorators;
    this.classToken = classToken;
    this.name = name;
    this.extendsToken = extendsToken;
    this.superClass = superClass;
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.elements = elements;
    this.closeCurlyBraceToken = closeCurlyBraceToken;

    this.classType = ClassType.create();
  }

  public static ClassTreeImpl newClassExpression(
    List<DecoratorTree> decorators, InternalSyntaxToken classToken, @Nullable IdentifierTree name,
    @Nullable InternalSyntaxToken extendsToken, @Nullable ExpressionTree superClass, InternalSyntaxToken openCurlyBraceToken,
    List<Tree> elements, InternalSyntaxToken closeCurlyBraceToken
  ) {

    return new ClassTreeImpl(Kind.CLASS_EXPRESSION, decorators, classToken, name, extendsToken, superClass, openCurlyBraceToken, elements, closeCurlyBraceToken);
  }

  public static ClassTreeImpl newClassDeclaration(
    List<DecoratorTree> decorators, InternalSyntaxToken classToken, @Nullable IdentifierTree name,
    @Nullable InternalSyntaxToken extendsToken, @Nullable ExpressionTree superClass, InternalSyntaxToken openCurlyBraceToken,
    List<Tree> elements, InternalSyntaxToken closeCurlyBraceToken
  ) {

    return new ClassTreeImpl(Kind.CLASS_DECLARATION, decorators, classToken, name, extendsToken, superClass, openCurlyBraceToken, elements, closeCurlyBraceToken);
  }

  @Override
  public List<DecoratorTree> decorators() {
    return decorators;
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
  public List<Tree> elements() {
    return elements;
  }

  @Override
  public Iterable<MethodDeclarationTree> methods() {
    return Iterables.filter(elements, MethodDeclarationTree.class);
  }

  @Override
  public Iterable<SyntaxToken> semicolons() {
    return Iterables.filter(elements, SyntaxToken.class);
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
      decorators.iterator(),
      Iterators.forArray(classToken, name, extendsToken, superClass, openCurlyBraceToken),
      elements.iterator(),
      Iterators.singletonIterator(closeCurlyBraceToken));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitClass(this);
  }

  @Override
  public TypeSet types() {
    TypeSet set = TypeSet.emptyTypeSet();
    set.add(classType);
    return set;
  }

  @Override
  public void add(Type type) {
    throw new UnsupportedOperationException();
  }

  public ClassType classType() {
    return classType;
  }
}
