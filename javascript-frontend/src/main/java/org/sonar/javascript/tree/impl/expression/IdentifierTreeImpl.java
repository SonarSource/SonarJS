/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class IdentifierTreeImpl extends JavaScriptTree implements IdentifierTree, TypableTree {

  private final InternalSyntaxToken nameToken;
  private final Kind kind;
  private Symbol symbol = null;
  private TypeSet types = TypeSet.emptyTypeSet();

  public IdentifierTreeImpl(Kind kind, InternalSyntaxToken nameToken) {
    this.kind = kind;
    this.nameToken = Preconditions.checkNotNull(nameToken);
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public SyntaxToken identifierToken() {
    return nameToken;
  }

  @Override
  public String name() {
    return identifierToken().text();
  }

  @Override
  public String toString() {
    return name();
  }

  @Override
  public Symbol symbol() {
    return symbol;
  }

  public void setSymbol(Symbol symbol) {
    this.symbol = symbol;
  }

  @Override
  public TypeSet types() {
    if (symbol == null) {
      return types.immutableCopy();
    } else {
      return symbol.types();
    }
  }

  @Override
  public void add(Type type) {
    if (symbol == null) {
      types.add(type);
    } else {
      symbol.addType(type);
    }
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(nameToken);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitIdentifier(this);
  }
}
