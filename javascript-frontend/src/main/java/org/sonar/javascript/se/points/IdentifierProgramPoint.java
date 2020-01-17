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
package org.sonar.javascript.se.points;

import java.util.Optional;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SymbolicExecution;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

public class IdentifierProgramPoint implements ProgramPoint {

  private IdentifierTree identifier;
  private SymbolicExecution execution;

  public IdentifierProgramPoint(Tree tree, SymbolicExecution execution) {
    this.identifier = (IdentifierTree) tree;
    this.execution = execution;
  }

  @Override
  public Optional<ProgramState> execute(ProgramState state) {
    SymbolicValue symbolicValue = state.getSymbolicValue(identifier, execution);

    if (symbolicValue == null) {
      symbolicValue = UnknownSymbolicValue.UNKNOWN;
    }
    return Optional.of(state.pushToStack(symbolicValue));
  }

  public static boolean originatesFrom(Tree element) {
    return element.is(Kind.IDENTIFIER_REFERENCE) && !LiteralProgramPoint.isUndefined(element);
  }
}
