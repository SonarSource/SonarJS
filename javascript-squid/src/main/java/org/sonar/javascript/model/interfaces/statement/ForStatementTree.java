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
package org.sonar.javascript.model.interfaces.statement;

import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;

/**
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-12.6.3">for Statement</a>.
 *
 * <pre>
 *   for ( {@link #init()} ; {@link #condition()} ; {@link #update()} ) {@link #statement()}
 *   for ( var {@link #init()} ; {@link #condition()} ; {@link #update()} ) {@link #statement()}
 * </pre>
 *
 * <p>This interface is not intended to be implemented by clients.</p>
 */
public interface ForStatementTree extends IterationStatementTree {

  SyntaxToken forKeyword();

  SyntaxToken openParenthesis();

  @Nullable
  Tree init();

  SyntaxToken firstSemicolon();

  @Nullable
  ExpressionTree condition();

  SyntaxToken secondSemicolon();

  @Nullable
  ExpressionTree update();

  SyntaxToken closeParenthesis();

  @Override
  StatementTree statement();

}
