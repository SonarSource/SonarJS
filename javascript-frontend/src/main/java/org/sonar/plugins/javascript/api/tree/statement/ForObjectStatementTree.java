/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.api.tree.statement;

import com.google.common.annotations.Beta;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * <pre>
 *   for ( {@link #variableOrExpression()} of {@link #expression()} {@link #statement()}
 *   for await ( {@link #variableOrExpression()} of {@link #expression()} {@link #statement()}
 *   for ( {@link #variableOrExpression()} in {@link #expression()} {@link #statement()}
 * </pre>
 */
@Beta
public interface ForObjectStatementTree extends IterationStatementTree {

  SyntaxToken forKeyword();

  @Nullable
  SyntaxToken awaitToken();

  SyntaxToken openParenthesisToken();

  Tree variableOrExpression();

  SyntaxToken ofOrInKeyword();

  ExpressionTree expression();

  SyntaxToken closeParenthesisToken();

  @Override
  StatementTree statement();

}
