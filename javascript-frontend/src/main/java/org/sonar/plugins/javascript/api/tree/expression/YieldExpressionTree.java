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
package org.sonar.plugins.javascript.api.tree.expression;

import com.google.common.annotations.Beta;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * <a href="http://people.mozilla.org/~jorendorff/es6-draft.html#sec-generator-function-definitions">Yield Expression</a>
 * (<a href="http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts">ES6</a>).
 * <pre>
 *   yield {@link #argument()}
 *   yield * {@link #argument()}
 * </pre>
 */
@Beta
public interface YieldExpressionTree extends ExpressionTree {

  SyntaxToken yieldKeyword();

  @Nullable
  SyntaxToken starToken();

  @Nullable
  ExpressionTree argument();
}
