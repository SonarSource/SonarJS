/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.base.Functions;
import com.google.common.collect.Iterables;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.parser.TreeFactory.Tuple;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.typescript.TSTypeParametersTree;
import org.sonar.plugins.javascript.api.tree.typescript.TSTypeReferenceTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

public class ClassTreeImpl extends JavaScriptTree implements ClassTree {

  private InternalSyntaxToken classToken;
  private IdentifierTreeImpl name;
  private ClassTail classTail;
  private final Kind kind;

  private ClassTreeImpl(Kind kind, InternalSyntaxToken classToken, @Nullable IdentifierTreeImpl name, ClassTail classTail) {

    this.kind = kind;

    this.classToken = classToken;
    this.name = name;
    this.classTail = classTail;
  }

  public static ClassTreeImpl newClassExpression(InternalSyntaxToken classToken, @Nullable IdentifierTreeImpl name, ClassTail classTail) {
    return new ClassTreeImpl(Kind.CLASS_EXPRESSION, classToken, name, classTail);
  }

  public static ClassTreeImpl newClassDeclaration(InternalSyntaxToken classToken, @Nullable IdentifierTreeImpl name, ClassTail classTail) {
    return new ClassTreeImpl(Kind.CLASS_DECLARATION, classToken, name, classTail);
  }

  @Override
  public SyntaxToken classToken() {
    return classToken;
  }

  @Override
  public IdentifierTree name() {
    return name;
  }

  @Nullable
  @Override
  public TSTypeParametersTree typeParameters() {
    return classTail.typeParameters;
  }

  @Override
  @Nullable
  public SyntaxToken extendsToken() {
    return classTail.extendsToken;
  }

  @Override
  @Nullable
  public TSTypeReferenceTree superClass() {
    return classTail.superClass;
  }

  @Nullable
  @Override
  public SyntaxToken implementsToken() {
    return classTail.implementsToken;
  }

  @Override
  public SeparatedList<TSTypeReferenceTree> implementedTypes() {
    return classTail.implementedTypes;
  }

  @Override
  public SyntaxToken openCurlyBraceToken() {
    return classTail.openCurlyBraceToken;
  }

  @Override
  public List<Tree> elements() {
    return classTail.elements;
  }

  @Override
  public Iterable<MethodDeclarationTree> methods() {
    return Iterables.filter(classTail.elements, MethodDeclarationTree.class);
  }

  @Override
  public Iterable<SyntaxToken> semicolons() {
    return Iterables.filter(classTail.elements, SyntaxToken.class);
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return classTail.closeCurlyBraceToken;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.forArray(classToken, name, classTail.typeParameters, classTail.extendsToken, classTail.superClass, classTail.implementsToken),
      classTail.implementedTypes.elementsAndSeparators(Functions.<TSTypeReferenceTree>identity()),
      Iterators.singletonIterator(classTail.openCurlyBraceToken),
      classTail.elements.iterator(),
      Iterators.singletonIterator(classTail.closeCurlyBraceToken));
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitClassDeclaration(this);
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  /**
   * This class is only for internal usage of {@link ClassTreeImpl}
   */
  public static class ClassTail {

    private final InternalSyntaxToken extendsToken;

    private final TSTypeReferenceTree superClass;
    private final TSTypeParametersTree typeParameters;

    private final InternalSyntaxToken implementsToken;
    private final SeparatedList<TSTypeReferenceTree> implementedTypes;

    private final InternalSyntaxToken openCurlyBraceToken;
    private final List<Tree> elements;
    private final InternalSyntaxToken closeCurlyBraceToken;


    public ClassTail(
      @Nullable TSTypeParametersTree typeParameters,
      @Nullable Tuple<InternalSyntaxToken, TSTypeReferenceTree> extendsClause,
      @Nullable Tuple<InternalSyntaxToken, SeparatedList<TSTypeReferenceTree>> implementsClause,
      InternalSyntaxToken openCurlyBraceToken, List<Tree> classBody, InternalSyntaxToken closeCurlyBraceToken
    ) {

      this.typeParameters = typeParameters;

      if (extendsClause == null) {
        this.extendsToken = null;
        this.superClass = null;
      } else {
        this.extendsToken = extendsClause.first();
        this.superClass = extendsClause.second();
      }

      if (implementsClause == null) {
        this.implementsToken = null;
        this.implementedTypes = SeparatedList.emptyList();
      } else {
        this.implementsToken = implementsClause.first();
        this.implementedTypes = implementsClause.second();
      }

      this.openCurlyBraceToken = openCurlyBraceToken;
      this.elements = classBody;
      this.closeCurlyBraceToken = closeCurlyBraceToken;

    }
  }

}
