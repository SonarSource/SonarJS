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

import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;
import java.util.List;

/**
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-11.2.5">Function expression</a>,
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generator-function-definitions">Generator function expression - ES6</a>.
 * <p/>
 *
 * Function expression ({@link Tree.Kind#FUNCTION_EXPRESSION}):
 * <pre>
 *    function {@link #name()} ( {@link #parameters()} ) {
 *      {@link #statements()}
 *    }
 *    function ( {@link #parameters()} ) {
 *      {@link #statements()}
 *    }
 * </pre>
 * Generator function expression ({@link Tree.Kind#GENERATOR_FUNCTION_EXPRESSION}):
 * <pre>
 *    function * {@link #name()} ( {@link #parameters()} ) {
 *      {@link #statements()}
 *    }
 *    function * ( {@link #parameters()} ) {
 *      {@link #statements()}
 *    }
 * </pre>
 * </p>
 *
 */
public interface FunctionExpressionTree extends ExpressionTree {

  SyntaxToken functionKeyword();

  @Nullable
  SyntaxToken star();

  @Nullable
  IdentifierTree name();

  ParameterListTree parameters();

  SyntaxToken openCurlyBrace();

  List<Tree> statements();

  SyntaxToken closeCurlyBrace();

}
