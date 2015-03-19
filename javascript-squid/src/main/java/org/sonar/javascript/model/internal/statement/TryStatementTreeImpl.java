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
package org.sonar.javascript.model.internal.statement;

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;

import javax.annotation.Nullable;
import java.util.Iterator;

public class TryStatementTreeImpl extends JavaScriptTree implements TryStatementTree {

  private SyntaxToken tryKeyword;
  private BlockTree block;
  @Nullable
  private CatchBlockTree catchBlock;
  @Nullable
  private SyntaxToken finallyKeyword;
  @Nullable
  private BlockTree finallyBlock;


  public TryStatementTreeImpl(CatchBlockTreeImpl catchBlock) {
    super(Kind.TRY_STATEMENT);
    this.catchBlock = catchBlock;

    addChildren(catchBlock);
  }

  public TryStatementTreeImpl(InternalSyntaxToken finallyKeyword, BlockTreeImpl finallyBlock) {
    super(Kind.TRY_STATEMENT);
    this.finallyKeyword = finallyKeyword;
    this.finallyBlock = finallyBlock;

    addChildren(finallyKeyword, finallyBlock);
  }

  public TryStatementTreeImpl complete(CatchBlockTreeImpl catchBlock) {
    Preconditions.checkState(this.catchBlock == null, "Catch block already completed");
    this.catchBlock = catchBlock;

    prependChildren(catchBlock);
    return this;
  }

  public TryStatementTreeImpl complete(InternalSyntaxToken tryKeyword, BlockTreeImpl block) {
    Preconditions.checkState(this.tryKeyword == null, "Already completed");
    this.tryKeyword = tryKeyword;
    this.block = block;

    prependChildren(tryKeyword, block);
    return this;
  }

  @Override
  public Kind getKind() {
    return Kind.TRY_STATEMENT;
  }

  @Override
  public SyntaxToken tryKeyword() {
    return tryKeyword;
  }

  @Override
  public BlockTree block() {
    return block;
  }

  @Nullable
  @Override
  public CatchBlockTree catchBlock() {
    return catchBlock;
  }

  @Nullable
  @Override
  public SyntaxToken finallyKeyword() {
    return finallyKeyword;
  }

  @Nullable
  @Override
  public BlockTree finallyBlock() {
    return finallyBlock;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(
      block,
      catchBlock,
      finallyBlock);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitTryStatement(this);
  }
}
