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

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.BlockTree;
import org.sonar.javascript.model.interfaces.statement.CatchBlockTree;

import java.util.Iterator;

public class CatchBlockTreeImpl extends JavaScriptTree implements CatchBlockTree {

  private final SyntaxToken catchKeyword;
  private final SyntaxToken openParenthesis;
  private final SyntaxToken closeParenthesis;
  private final BlockTree block;

  public CatchBlockTreeImpl(InternalSyntaxToken catchKeyword, InternalSyntaxToken openParenthesis, AstNode catchParameter, InternalSyntaxToken closeParenthesis, BlockTreeImpl block) {
    super(Kind.CATCH_BLOCK);
    this.catchKeyword = catchKeyword;
    this.openParenthesis = openParenthesis;
    this.closeParenthesis = closeParenthesis;
    this.block = block;

    addChildren(catchKeyword, openParenthesis, catchParameter, closeParenthesis, block);
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
  public Tree catchParameter() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
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
    return Iterators.<Tree>singletonIterator(block);
  }

}
