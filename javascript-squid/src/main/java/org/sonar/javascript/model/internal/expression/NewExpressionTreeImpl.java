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
package org.sonar.javascript.model.internal.expression;

import com.google.common.collect.Iterators;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

import javax.annotation.Nullable;
import java.util.Iterator;

public class NewExpressionTreeImpl extends JavaScriptTree implements NewExpressionTree {

  private final Kind kind;
  private final SyntaxToken newKeyword;
  private final ExpressionTree expression;
  private final ParameterListTree arguments;
  private TypeSet types = TypeSet.emptyTypeSet();

  public NewExpressionTreeImpl(Kind kind, InternalSyntaxToken newKeyword, ExpressionTree expression) {
    this.kind = kind;
    this.expression = expression;
    this.newKeyword =  newKeyword;
    this.arguments = null;

  }

  public NewExpressionTreeImpl(Kind kind, InternalSyntaxToken newKeyword, ExpressionTree expression, ParameterListTreeImpl arguments) {
    this.kind = kind;
    this.newKeyword = newKeyword;
    this.expression = expression;
    this.arguments = arguments;

  }

  @Override
  public SyntaxToken newKeyword() {
    return newKeyword;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Nullable
  @Override
  public ParameterListTree arguments() {
    return arguments;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(newKeyword, expression, arguments);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitNewExpression(this);
  }

  @Override
  public TypeSet types() {
    return types.immutableCopy();
  }

  public void addType(Type type) {
    types.add(type);
  }
}
