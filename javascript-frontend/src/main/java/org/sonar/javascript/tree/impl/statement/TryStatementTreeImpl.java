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
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.FinallyBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class TryStatementTreeImpl extends JavaScriptTree implements TryStatementTree {

  private final SyntaxToken tryKeyword;
  private final BlockTree block;
  private final CatchBlockTree catchBlock;
  private final FinallyBlockTree finallyBlock;

  public TryStatementTreeImpl(SyntaxToken tryKeyword, BlockTree block, @Nullable CatchBlockTree catchBlock, @Nullable FinallyBlockTree finallyBlock) {
    this.tryKeyword = tryKeyword;
    this.block = block;
    this.catchBlock = catchBlock;
    this.finallyBlock = finallyBlock;
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
  public FinallyBlockTree finallyBlock() {
    return finallyBlock;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(
      tryKeyword,
      block,
      catchBlock,
      finallyBlock);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitTryStatement(this);
  }
}
