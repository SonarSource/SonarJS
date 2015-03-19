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
package org.sonar.javascript.model.internal.declaration;

import com.google.common.collect.Iterators;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.expression.LiteralTreeImpl;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.Iterator;

public class FromClauseTreeImpl extends JavaScriptTree implements FromClauseTree {

  private final SyntaxToken fromToken;
  private final LiteralTree module;

  public FromClauseTreeImpl(InternalSyntaxToken fromToken, LiteralTreeImpl module) {
    super(Kind.FROM_CLAUSE);

    this.fromToken = fromToken;
    this.module = module;

    addChildren(fromToken, module);
  }

  @Override
  public SyntaxToken fromToken() {
    return fromToken;
  }

  @Override
  public LiteralTree module() {
    return module;
  }

  @Override
  public Kind getKind() {
    return Kind.FROM_CLAUSE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>forArray(module);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitFromClause(this);
  }
}
