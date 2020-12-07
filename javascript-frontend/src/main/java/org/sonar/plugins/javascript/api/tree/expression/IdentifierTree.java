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
import java.util.Optional;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportSubClauseTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-7.6">Identifier</a>
 * <ul>
 *   <li>{@link Kind#PROPERTY_IDENTIFIER}</li>
 *   <li>{@link Kind#IDENTIFIER_REFERENCE}</li>
 *   <li>{@link Kind#BINDING_IDENTIFIER}</li>
 *   <li>{@link Kind#THIS}</li>
 * </ul>
 */
@Beta
public interface IdentifierTree extends ExpressionTree, BindingElementTree, ImportSubClauseTree {

  SyntaxToken identifierToken();

  String name();

  /**
   * @return {@link Usage} corresponding to this identifier. Empty optional is returned when there is no symbol available for this identifier (see {@link IdentifierTree#symbol()})
   */
  Optional<Usage> symbolUsage();

  /**
   * @return {@link Symbol} which is referenced by this identifier. No {@link Symbol} is returned in several cases:
   * <ul>
   *   <li>for {@link Kind#PROPERTY_IDENTIFIER}</li>
   *   <li>for unresolved symbol (i.e. symbol being read without being written)</li>
   * </ul>
   * Note that {@link Kind#BINDING_IDENTIFIER} (used for symbol declaration) always has corresponding symbol.
   * Note that this method is a shortcut for {@link IdentifierTree#symbolUsage()#symbol()}.
   */
  Optional<Symbol> symbol();

  /**
   * @return {@link Scope} instance in which this identifier appear
   */
  Scope scope();
}
