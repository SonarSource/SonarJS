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

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

import javax.annotation.Nullable;
import java.util.Iterator;

public class BreakStatementTreeImpl extends JavaScriptTree implements BreakStatementTree {

  private SyntaxToken breakKeyword;
  private final IdentifierTree label;
  private final SyntaxToken semicolonToken;

  public BreakStatementTreeImpl(SyntaxToken semicolonToken) {
    this.label = null;
    this.semicolonToken = semicolonToken;
  }

  public BreakStatementTreeImpl(IdentifierTree label, SyntaxToken semicolonToken) {
    this.label = label;
    this.semicolonToken = semicolonToken;
  }

  public BreakStatementTreeImpl complete(InternalSyntaxToken breakKeyword) {
    Preconditions.checkState(this.breakKeyword == null, "Already completed");
    this.breakKeyword = breakKeyword;

    return this;
  }

  @Override
  public Kind getKind() {
    return Kind.BREAK_STATEMENT;
  }

  @Override
  public SyntaxToken breakKeyword() {
    return breakKeyword;
  }

  @Nullable
  @Override
  public IdentifierTree label() {
    return label;
  }

  @Nullable
  @Override
  public SyntaxToken semicolonToken() {
    return semicolonToken;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(breakKeyword, label, semicolonToken);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitBreakStatement(this);
  }
}
