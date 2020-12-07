/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ElseClauseTreeImpl extends JavaScriptTree implements ElseClauseTree {

  private SyntaxToken elseKeyword;
  private final StatementTree statement;

  public ElseClauseTreeImpl(InternalSyntaxToken elseKeyword, StatementTree statement) {
    this.elseKeyword = elseKeyword;
    this.statement = statement;

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
  public Kind getKind() {
    return Kind.ELSE_CLAUSE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(elseKeyword, statement);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitElseClause(this);
  }
}
