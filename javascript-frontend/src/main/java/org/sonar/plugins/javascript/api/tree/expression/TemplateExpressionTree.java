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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-template-literal-lexical-components">expression nested in template</a>
 * (<a href="http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts">ES6</a>).
 * <p/>
 * <pre>
 *   ${ {@link #expression()} }
 * </pre>
 */
@Beta
public interface TemplateExpressionTree extends Tree {

  SyntaxToken dollarToken();

  SyntaxToken openCurlyBraceToken();

  ExpressionTree expression();

  SyntaxToken closeCurlyBraceToken();
}
