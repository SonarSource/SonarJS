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
package org.sonar.javascript.tree.impl.statement;

import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class CatchBlockTreeImpl extends JavaScriptTree implements CatchBlockTree {

  private final SyntaxToken catchKeyword;
  private final SyntaxToken openParenthesis;
  private final BindingElementTree parameter;
  private final SyntaxToken closeParenthesis;
  private final BlockTree block;

  public CatchBlockTreeImpl(
    InternalSyntaxToken catchKeyword, InternalSyntaxToken openParenthesis,
    BindingElementTree parameter, InternalSyntaxToken closeParenthesis, BlockTree block
  ) {

    this.catchKeyword = catchKeyword;
    this.openParenthesis = openParenthesis;
    this.parameter = parameter;
    this.closeParenthesis = closeParenthesis;
    this.block = block;
  }

  @Override
  public Kind getKind() {
    return Kind.CATCH_BLOCK;
  }

  @Override
  public SyntaxToken catchKeyword() {
    return catchKeyword;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Override
  public Tree parameter() {
    return parameter;
  }

  @Override
  public SyntaxToken closeParenthesis() {
    return closeParenthesis;
  }

  @Override
  public BlockTree block() {
    return block;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(catchKeyword, openParenthesis, parameter, closeParenthesis, block);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitCatchBlock(this);
  }

  public List<IdentifierTree> parameterIdentifiers() {
    List<IdentifierTree> bindingIdentifiers = Lists.newArrayList();

    if (parameter.is(Kind.BINDING_IDENTIFIER)) {
      return Lists.newArrayList((IdentifierTree) parameter);

    } else {
      bindingIdentifiers.addAll(parameter.bindingIdentifiers());
    }

    return bindingIdentifiers;
  }

}
