/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class IdentifierTreeImpl extends JavaScriptTree implements IdentifierTree, TypableTree {

  private final InternalSyntaxToken nameToken;
  private final Kind kind;
  private Usage usage = null;
  private TypeSet types = TypeSet.emptyTypeSet();
  private Scope scope;

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
  public Optional<Usage> symbolUsage() {
    return Optional.ofNullable(usage);
  }

  @Override
  public final Optional<Symbol> symbol() {
    if (usage == null) {
      return Optional.empty();
    }
    return Optional.of(usage.symbol());
  }

  public void setSymbolUsage(Usage usage) {
    this.usage = usage;
  }

  @Override
  public TypeSet types() {
    return symbol().map(Symbol::types).orElse(types.immutableCopy());
  }

  @Override
  public void add(Type type) {
    final Optional<Symbol> symbol = symbol();
    if (symbol.isPresent()) {
      symbol.get().addType(type);
    } else {
      types.add(type);
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

  @Override
  public Scope scope(){
    return scope;
  }

  public void scope(Scope scope) {
    this.scope = scope;
  }

  @Override
  public List<IdentifierTree> bindingIdentifiers() {
    return ImmutableList.of(this);
  }
}
