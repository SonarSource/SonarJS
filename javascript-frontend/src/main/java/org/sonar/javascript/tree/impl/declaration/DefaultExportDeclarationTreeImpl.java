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
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.DefaultExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class DefaultExportDeclarationTreeImpl extends JavaScriptTree implements DefaultExportDeclarationTree {

  private final SyntaxToken exportToken;
  private final SyntaxToken defaultToken;
  private final Tree object;
  private final InternalSyntaxToken eos;
  private final List<DecoratorTree> decorators;

  public DefaultExportDeclarationTreeImpl(
    List<DecoratorTree> decorators,
    InternalSyntaxToken exportToken, InternalSyntaxToken defaultToken, Tree object, @Nullable InternalSyntaxToken semicolon) {

    this.exportToken = exportToken;
    this.defaultToken = defaultToken;
    this.object = object;
    this.eos = semicolon;
    this.decorators = decorators;
  }

  @Override
  public List<DecoratorTree> decorators() {
    return decorators;
  }

  @Override
  public SyntaxToken exportToken() {
    return exportToken;
  }

  @Override
  public SyntaxToken defaultToken() {
    return defaultToken;
  }

  @Override
  public Tree object() {
    return object;
  }

  @Nullable
  @Override
  public InternalSyntaxToken semicolonToken() {
    return eos;
  }

  @Override
  public Kind getKind() {
    return Kind.DEFAULT_EXPORT_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(decorators.iterator(), Iterators.forArray(exportToken, defaultToken, object, eos));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitDefaultExportDeclaration(this);
  }
}
