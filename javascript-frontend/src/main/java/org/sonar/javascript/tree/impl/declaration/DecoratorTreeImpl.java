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

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.expression.ArgumentListTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class DecoratorTreeImpl extends JavaScriptTree implements DecoratorTree {

  private final SyntaxToken atToken;
  private final SeparatedList<IdentifierTree> body;
  private final ArgumentListTree arguments;

  public DecoratorTreeImpl(SyntaxToken atToken, SeparatedList<IdentifierTree> body, @Nullable ArgumentListTree arguments) {
    this.atToken = atToken;
    this.body = body;
    this.arguments = arguments;
  }

  @Override
  public Kind getKind() {
    return Kind.DECORATOR;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(atToken),
      body.elementsAndSeparators(Functions.identity()),
      Iterators.singletonIterator(arguments)
    );
  }

  @Override
  public SyntaxToken atToken() {
    return atToken;
  }

  @Override
  public SeparatedList<IdentifierTree> body() {
    return body;
  }

  @Nullable
  @Override
  public ArgumentListTree argumentClause() {
    return arguments;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitDecorator(this);
  }
}
