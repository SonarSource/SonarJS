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
package org.sonar.plugins.javascript.api.tree.expression;

import com.google.common.annotations.Beta;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-11.2.2">New Expression</a>.
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-11.2">New Member Expression</a>.
 * <pre>
 *   new {@link #expression()}
 *   new {@link #expression()} {@link #argumentClause()}
 *   new {@link Tree.Kind#NEW_SUPER super}
 *   new {@link Tree.Kind#NEW_SUPER super} {@link #argumentClause()}
 * </pre>
 */
@Beta
public interface NewExpressionTree extends ExpressionTree {

  SyntaxToken newKeyword();

  ExpressionTree expression();

  @Nullable
  ArgumentListTree argumentClause();

}
