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

import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class YieldExpressionTreeImpl extends JavaScriptTree implements YieldExpressionTree, TypableTree {

  private InternalSyntaxToken yieldKeyword;
  private final InternalSyntaxToken star;
  private final ExpressionTree argument;

  public YieldExpressionTreeImpl(InternalSyntaxToken yieldKeyword, @Nullable InternalSyntaxToken star, @Nullable ExpressionTree argument) {
    this.yieldKeyword = yieldKeyword;
    this.star = star;
    this.argument = argument;

  }

  @Override
  public SyntaxToken yieldKeyword() {
    return yieldKeyword;
  }

  @Nullable
  @Override
  public SyntaxToken star() {
    return star;
  }

  @Override
  public ExpressionTree argument() {
    return argument;
  }

  @Override
  public Kind getKind() {
    return Kind.YIELD_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(yieldKeyword, star, argument);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitYieldExpression(this);
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  @Override
  public void add(Type type) {
    throw new UnsupportedOperationException();
  }
}
