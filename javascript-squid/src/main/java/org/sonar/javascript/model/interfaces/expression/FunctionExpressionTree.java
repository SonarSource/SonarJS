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
package org.sonar.javascript.model.interfaces.expression;

import com.google.common.annotations.Beta;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.BlockTree;

import javax.annotation.Nullable;

/**
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-11.2.5">Function expression</a>,
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generator-function-definitions">Generator function expression</a> (<a href="http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts">ES6</a>).
 */
@Beta
public interface FunctionExpressionTree extends ExpressionTree {

  SyntaxToken functionKeyword();

  @Nullable
  SyntaxToken star();

  @Nullable
  IdentifierTree name();

  ParameterListTree parameters();

  BlockTree body();

}
