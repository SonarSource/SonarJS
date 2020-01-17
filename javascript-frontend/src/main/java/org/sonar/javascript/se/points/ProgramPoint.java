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
import org.sonar.plugins.javascript.api.tree.Tree;

public interface ProgramPoint {

  Optional<ProgramState> execute(ProgramState state);

  static ProgramPoint create(Tree element, SymbolicExecution execution) {
    if (MemberProgramPoint.originatesFrom(element)) {
      return new MemberProgramPoint(element);
    }
    if (PlusProgramPoint.originatesFrom(element)) {
      return new PlusProgramPoint();
    }
    if (StrictlyArithmeticBinaryProgramPoint.originatesFrom(element)) {
      return new StrictlyArithmeticBinaryProgramPoint();
    }
    if (BitwiseBinaryProgramPoint.originatesFrom(element)) {
      return new BitwiseBinaryProgramPoint();
    }
    if (UnaryNumericProgramPoint.originatesFrom(element)) {
      return new UnaryNumericProgramPoint(element, execution);
    }
    if (IdentifierProgramPoint.originatesFrom(element)) {
      return new IdentifierProgramPoint(element, execution);
    }
    if (LiteralProgramPoint.originatesFrom(element)) {
      return new LiteralProgramPoint(element);
    }
    // Once everything is migrated to program points, we should consider raising an exception here.
    return new NoActionProgramPoint();
  }

}
