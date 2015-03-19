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

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.apache.commons.collections.ListUtils;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;

import java.util.Iterator;
import java.util.List;

public class BlockTreeImpl extends JavaScriptTree implements BlockTree {

  private final SyntaxToken openCurlyBrace;
  private final List<StatementTree> statements;
  private final SyntaxToken closeCurlyBrace;

  public BlockTreeImpl(InternalSyntaxToken openCurlyBrace, List<StatementTree> statements, InternalSyntaxToken closeCurlyBrace) {
    super(Kind.BLOCK);
    this.openCurlyBrace = openCurlyBrace;
    this.statements = statements;
    this.closeCurlyBrace = closeCurlyBrace;

    addChild(openCurlyBrace);
    for (StatementTree child : statements) {
      addChild((AstNode) child);
    }
    addChild(closeCurlyBrace);
  }

  public BlockTreeImpl(InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace) {
    super(Kind.BLOCK);
    this.openCurlyBrace = openCurlyBrace;
    this.statements = ListUtils.EMPTY_LIST;
    this.closeCurlyBrace = closeCurlyBrace;

    addChild(openCurlyBrace);
    addChild(closeCurlyBrace);
  }

  @Override
  public Kind getKind() {
    return Kind.BLOCK;
  }

  @Override
  public SyntaxToken openCurlyBrace() {
    return openCurlyBrace;
  }

  @Override
  public List<StatementTree> statements() {
    return statements;
  }

  @Override
  public SyntaxToken closeCurlyBrace() {
    return closeCurlyBrace;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>concat(statements.iterator());
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitBlock(this);
  }
}
