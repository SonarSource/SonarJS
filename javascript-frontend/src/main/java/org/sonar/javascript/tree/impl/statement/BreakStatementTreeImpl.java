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
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class BreakStatementTreeImpl extends JavaScriptTree implements BreakStatementTree {

  private SyntaxToken breakKeyword;
  private final IdentifierTree label;
  private final SyntaxToken semicolonToken;

  public BreakStatementTreeImpl(SyntaxToken breakKeyword, @Nullable IdentifierTree label, @Nullable SyntaxToken semicolonToken) {
    this.breakKeyword = breakKeyword;
    this.label = label;
    this.semicolonToken = semicolonToken;
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
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitBreakStatement(this);
  }
}
