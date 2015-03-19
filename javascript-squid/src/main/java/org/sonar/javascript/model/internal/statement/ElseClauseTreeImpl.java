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
import com.sonar.sslr.api.AstNodeType;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;

import javax.annotation.Nullable;
import java.util.Iterator;

public class ElseClauseTreeImpl extends JavaScriptTree implements ElseClauseTree {

  private SyntaxToken elseKeyword;
  private final StatementTree statement;

  public ElseClauseTreeImpl(InternalSyntaxToken elseKeyword, StatementTree statement) {
    super(Kind.ELSE_CLAUSE);
    this.elseKeyword = elseKeyword;
    this.statement = statement;

    addChildren(elseKeyword, (AstNode) statement);
  }

  @Override
  public SyntaxToken elseKeyword() {
    return elseKeyword;
  }

  @Nullable
  @Override
  public StatementTree statement() {
    return statement;
  }

  @Override
  public AstNodeType getKind() {
    return Kind.ELSE_CLAUSE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(statement);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitElseClause(this);
  }
}
