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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-11.4">Unary Operator</a>
 * and <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-11.3">Postfix Expression</a>.
 * <pre>
 *   {@link #expression()} {@link Tree.Kind#POSTFIX_INCREMENT ++}
 *   {@link #expression()} {@link Tree.Kind#POSTFIX_DECREMENT --}
 *   {@link Tree.Kind++} {@link #expression()}
 *   {@link Tree.Kind#DELETE delete} {@link #expression()}
 *   {@link Tree.Kind#VOID void} {@link #expression()}
 *   {@link Tree.Kind#TYPEOF typeof} {@link #expression()}
 *   {@link Tree.Kind#PREFIX_DECREMENT --} {@link #expression()}
 *   {@link Tree.Kind#UNARY_PLUS +} {@link #expression()}
 *   {@link Tree.Kind#UNARY_MINUS -} {@link #expression()}
 *   {@link Tree.Kind#BITWISE_COMPLEMENT ~} {@link #expression()}
 *   {@link Tree.Kind#LOGICAL_COMPLEMENT !} {@link #expression()}
 * </pre>
 */
@Beta
public interface UnaryExpressionTree extends ExpressionTree {

  SyntaxToken operatorToken();

  ExpressionTree expression();

}
