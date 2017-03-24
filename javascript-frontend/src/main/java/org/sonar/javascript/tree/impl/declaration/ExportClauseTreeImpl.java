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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.FromClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierListTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ExportClauseTreeImpl extends JavaScriptTree implements ExportClauseTree {

  private final SpecifierListTree exports;
  private final FromClauseTree fromClause;
  private final SyntaxToken semicolonToken;

  public ExportClauseTreeImpl(SpecifierListTree exports, @Nullable SyntaxToken semicolonToken) {

    this.exports = exports;
    this.fromClause = null;
    this.semicolonToken = semicolonToken;
  }

  public ExportClauseTreeImpl(SpecifierListTree exports, FromClauseTree fromClause, @Nullable SyntaxToken semicolonToken) {

    this.exports = exports;
    this.fromClause = fromClause;
    this.semicolonToken = semicolonToken;

  }

  @Override
  public SpecifierListTree exports() {
    return exports;
  }

  @Override
  public FromClauseTree fromClause() {
    return fromClause;
  }

  @Nullable
  @Override
  public SyntaxToken semicolonToken() {
    return semicolonToken;
  }

  @Override
  public Kind getKind() {
    return Kind.EXPORT_CLAUSE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(exports, fromClause, semicolonToken);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitExportClause(this);
  }
}
