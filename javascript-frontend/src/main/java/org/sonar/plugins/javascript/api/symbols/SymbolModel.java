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
package org.sonar.plugins.javascript.api.symbols;

import com.google.common.annotations.Beta;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;

@Beta
public interface SymbolModel {
  /**
   * Returns all symbols in script
   */
  Set<Symbol> getSymbols();

  /**
   * @param kind kind of symbols to look for
   * @return list of symbols with the given kind
   */
  Set<Symbol> getSymbols(Symbol.Kind kind);

  /**
   * @param name name of symbols to look for
   * @return list of symbols with the given name
   */
  Set<Symbol> getSymbols(String name);

  /**
   * @param tree
   * @return scope corresponding to this tree. Returns Null if no scope found
   */
  @Nullable
  Scope getScope(Tree tree);
}
