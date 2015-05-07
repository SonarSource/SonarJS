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
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.StatementTree;

import javax.annotation.Nullable;
import java.util.List;

/**
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-class-definitions">Class expression</a> (<a href="http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts">ES6</a>).
 * <pre>
 *  class { {@link #elements()} }
 *  class {@link #name()} { {@link #elements()} }
 *  class {@link #name()} extends {@link #superClass()}} { {@link #elements()} }
 * </pre>
 */
@Beta
public interface ClassTree extends ExpressionTree, StatementTree {

  SyntaxToken classToken();

  @Nullable
  IdentifierTree name();

  @Nullable
  SyntaxToken extendsToken();

  @Nullable
  ExpressionTree superClass();

  SyntaxToken openCurlyBraceToken();

  List<MethodDeclarationTree> elements();

  List<SyntaxToken> semicolons();

  SyntaxToken closeCurlyBraceToken();

}
