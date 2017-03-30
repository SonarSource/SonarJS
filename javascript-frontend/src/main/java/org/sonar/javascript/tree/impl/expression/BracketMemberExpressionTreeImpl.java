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
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class BracketMemberExpressionTreeImpl extends JavaScriptTree implements BracketMemberExpressionTree, TypableTree {

  private ExpressionTree object;
  private final SyntaxToken openBracket;
  private final ExpressionTree property;
  private final SyntaxToken closeBracket;
  private TypeSet types = TypeSet.emptyTypeSet();

  public BracketMemberExpressionTreeImpl(ExpressionTree object, SyntaxToken openBracket, ExpressionTree property, SyntaxToken closeBracket) {
    this.object = object;
    this.openBracket = openBracket;
    this.property = property;
    this.closeBracket = closeBracket;
  }

  @Override
  public ExpressionTree object() {
    return object;
  }

  @Override
  public SyntaxToken openBracket() {
    return openBracket;
  }

  @Override
  public ExpressionTree property() {
    return property;
  }

  @Override
  public void add(Type type) {
    types.add(type);
  }

  @Override
  public SyntaxToken closeBracket() {
    return closeBracket;
  }

  @Override
  public Kind getKind() {
    return Kind.BRACKET_MEMBER_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(object, openBracket, property, closeBracket);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitMemberExpression(this);
  }

  @Override
  public TypeSet types() {
    return types.immutableCopy();
  }
}
