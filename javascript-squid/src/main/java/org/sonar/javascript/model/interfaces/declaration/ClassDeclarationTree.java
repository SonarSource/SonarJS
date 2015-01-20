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
package org.sonar.javascript.model.interfaces.declaration;

import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.StatementTree;

import javax.annotation.Nullable;
import java.util.List;

/**
 * Interface for type
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-class-definitions">Class Definitions</a>
 *
 * <pre>
 *  class {@link #name()} { {@link #members()} }
 *  class {@link #name()} extends {@link #superClass()}} { {@link #members()} }
 * </pre>
 *
 * <p>This interface is not intended to be implemented by clients.</p>
 */
public interface ClassDeclarationTree extends DeclarationTree {

  SyntaxToken classToken();

  IdentifierTree name();

  @Nullable
  SyntaxToken extendsToken();

  @Nullable
  ExpressionTree superClass();

  SyntaxToken openCurlyBraceToken();

  List<MethodDeclarationTree> members();

  SyntaxToken closeCurlyBraceToken();

}
