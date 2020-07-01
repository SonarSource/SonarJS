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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FieldDeclarationTreeImpl extends JavaScriptTree implements FieldDeclarationTree {

  private final List<DecoratorTree> decorators;
  private final SyntaxToken staticToken;
  private final Tree propertyName;
  private final FlowTypeAnnotationTree typeAnnotation;
  private final SyntaxToken equalToken;
  private final ExpressionTree initializer;
  private final SyntaxToken semicolonToken;

  public FieldDeclarationTreeImpl(
    List<DecoratorTree> decorators,
    @Nullable SyntaxToken staticToken, Tree propertyName,
    @Nullable FlowTypeAnnotationTree typeAnnotation, @Nullable SyntaxToken equalToken, @Nullable ExpressionTree initializer, @Nullable SyntaxToken semicolonToken
  ) {
    this.decorators = decorators;
    this.staticToken = staticToken;
    this.propertyName = propertyName;
    this.typeAnnotation = typeAnnotation;
    this.equalToken = equalToken;
    this.initializer = initializer;
    this.semicolonToken = semicolonToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FIELD;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(decorators.iterator(), Iterators.forArray(staticToken, propertyName, typeAnnotation, equalToken, initializer, semicolonToken));
  }

  @Override
  public List<DecoratorTree> decorators() {
    return decorators;
  }

  @Nullable
  @Override
  public SyntaxToken staticToken() {
    return staticToken;
  }

  @Override
  public Tree propertyName() {
    return propertyName;
  }

  @Nullable
  @Override
  public FlowTypeAnnotationTree typeAnnotation() {
    return typeAnnotation;
  }

  @Nullable
  @Override
  public SyntaxToken equalToken() {
    return equalToken;
  }

  @Nullable
  @Override
  public ExpressionTree initializer() {
    return initializer;
  }

  @Nullable
  @Override
  public SyntaxToken semicolonToken() {
    return semicolonToken;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFieldDeclaration(this);
  }
}
