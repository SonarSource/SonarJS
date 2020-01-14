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
package org.sonar.plugins.javascript.api.tree.declaration;

import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * This interface stands for the tail of export declaration (proposed for ES2017)
 * <pre>export A, * as B from 'moduleName';</pre>
 * <pre>export {@link #exportedDefaultIdentifier()}, * as {@link #synonymIdentifier()} {@link #fromClause()} ;</pre>
 */
public interface ExportDefaultBindingWithNameSpaceExport extends Tree {

  IdentifierTree exportedDefaultIdentifier();

  SyntaxToken commaToken();

  SyntaxToken starToken();

  SyntaxToken asToken();

  IdentifierTree synonymIdentifier();

  FromClauseTree fromClause();

  @Nullable
  SyntaxToken semicolonToken();
}
