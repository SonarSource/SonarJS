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
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.NamedExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class NamedExportDeclarationTreeImpl extends JavaScriptTree implements NamedExportDeclarationTree {

  private final List<DecoratorTree> decorators;
  private final SyntaxToken exportToken;
  private final Tree object;

  public NamedExportDeclarationTreeImpl(List<DecoratorTree> decorators, InternalSyntaxToken exportToken, Tree object) {
    this.decorators = decorators;
    this.exportToken = exportToken;
    this.object = object;

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
  public Tree object() {
    return object;
  }

  @Override
  public Kind getKind() {
    return Kind.NAMED_EXPORT_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(decorators.iterator(), Iterators.forArray(exportToken, object));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitNamedExportDeclaration(this);
  }
}
