/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
import com.sonar.sslr.api.AstNodeType;
import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

import java.util.Iterator;
import java.util.List;

public class DefaultClauseTreeImpl extends JavaScriptTree implements DefaultClauseTree {

  private final SyntaxToken defaultKeyword;
  private final SyntaxToken colon;
  private final List<StatementTree> statements;

  public DefaultClauseTreeImpl(InternalSyntaxToken defaultKeyword, InternalSyntaxToken colon) {
    this.defaultKeyword = defaultKeyword;
    this.colon = colon;
    this.statements = ListUtils.EMPTY_LIST;

  }

  public DefaultClauseTreeImpl(InternalSyntaxToken defaultKeyword, InternalSyntaxToken colon, List<StatementTree> statements) {
    this.defaultKeyword = defaultKeyword;
    this.colon = colon;
    this.statements = statements;

  }

  @Override
  public SyntaxToken keyword() {
    return defaultKeyword;
  }

  @Override
  public SyntaxToken colon() {
    return colon;
  }

  @Override
  public List<StatementTree> statements() {
    return statements;
  }

  @Override
  public AstNodeType getKind() {
    return Kind.DEFAULT_CLAUSE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.forArray(defaultKeyword, colon),
      statements.iterator());
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitDefaultClause(this);
  }
}
