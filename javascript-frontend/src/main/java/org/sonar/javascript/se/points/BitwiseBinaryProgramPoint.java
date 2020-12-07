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

import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.plugins.javascript.api.tree.Tree;

public class BitwiseBinaryProgramPoint extends BinaryProgramPoint {
  @Override
  public SymbolicValue resolveValue(Constraint firstOperandConstraint, Constraint secondOperandConstraint, SymbolicValue firstOperandValue, SymbolicValue secondOperandValue) {
    return new SymbolicValueWithConstraint(Constraint.NUMBER_PRIMITIVE);
  }

  public static boolean originatesFrom(Tree element) {
    return element.is(
      Tree.Kind.BITWISE_AND,
      Tree.Kind.BITWISE_XOR,
      Tree.Kind.BITWISE_OR,
      Tree.Kind.LEFT_SHIFT,
      Tree.Kind.RIGHT_SHIFT,
      Tree.Kind.UNSIGNED_RIGHT_SHIFT);
  }
}
