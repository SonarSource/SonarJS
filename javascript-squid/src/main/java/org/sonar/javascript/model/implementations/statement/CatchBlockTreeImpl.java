/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
package org.sonar.javascript.model.implementations.statement;

import java.util.Iterator;
import java.util.List;

import com.google.common.collect.Lists;
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.declaration.ArrayBindingPatternTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ObjectBindingPatternTreeImpl;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.BindingElementTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
import org.sonar.javascript.model.interfaces.statement.CatchBlockTree;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;

public class CatchBlockTreeImpl extends JavaScriptTree implements CatchBlockTree {

  private final SyntaxToken catchKeyword;
  private final SyntaxToken openParenthesis;
  private final BindingElementTree parameter;
  private final SyntaxToken closeParenthesis;
  private final BlockTree block;

  public CatchBlockTreeImpl(InternalSyntaxToken catchKeyword, InternalSyntaxToken openParenthesis,
    BindingElementTree parameter, InternalSyntaxToken closeParenthesis, BlockTreeImpl block) {

    super(Kind.CATCH_BLOCK);
    this.catchKeyword = catchKeyword;
    this.openParenthesis = openParenthesis;
    this.parameter = parameter;
    this.closeParenthesis = closeParenthesis;
    this.block = block;

    addChildren(catchKeyword, openParenthesis, (AstNode) parameter, closeParenthesis, block);
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
    return Iterators.forArray(parameter, block);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitCatchBlock(this);
  }

  public List<IdentifierTree> parameterIdentifiers() {
    List<IdentifierTree> bindingIdentifiers = Lists.newArrayList();

    if (parameter.is(Kind.BINDING_IDENTIFIER)) {
      return Lists.newArrayList((IdentifierTree) parameter);

    } else if (parameter.is(Kind.OBJECT_BINDING_PATTERN)) {
      bindingIdentifiers.addAll(((ObjectBindingPatternTreeImpl) parameter).bindingIdentifiers());

    } else {
      bindingIdentifiers.addAll(((ArrayBindingPatternTreeImpl) parameter).bindingIdentifiers());
    }

    return bindingIdentifiers;
  }

}
