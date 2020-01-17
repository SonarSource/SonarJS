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

public class StrictlyArithmeticBinaryProgramPoint extends BinaryProgramPoint {

  private static final Constraint NUMBER_LIKE_OBJECT = Constraint.NUMBER_OBJECT.or(Constraint.BOOLEAN_OBJECT).or(Constraint.DATE);
  private static final Constraint UNDEFINED_OR_NON_NUMBER_OBJECT = Constraint.UNDEFINED.or(Constraint.OBJECT.and(NUMBER_LIKE_OBJECT.not()));

  @Override
  protected SymbolicValue resolveValue(Constraint firstOperandConstraint, Constraint secondOperandConstraint, SymbolicValue firstOperandValue, SymbolicValue secondOperandValue) {
    if (firstOperandConstraint.isStricterOrEqualTo(UNDEFINED_OR_NON_NUMBER_OBJECT) ||
      secondOperandConstraint.isStricterOrEqualTo(UNDEFINED_OR_NON_NUMBER_OBJECT)) {
      return new SymbolicValueWithConstraint(Constraint.NAN);
    } else {
      return new SymbolicValueWithConstraint(Constraint.NUMBER_PRIMITIVE);
    }
  }

  public static boolean originatesFrom(Tree element) {
    return element.is(
      Tree.Kind.MINUS,
      Tree.Kind.MULTIPLY,
      Tree.Kind.DIVIDE,
      Tree.Kind.REMAINDER,
      Tree.Kind.MINUS_ASSIGNMENT,
      Tree.Kind.MULTIPLY_ASSIGNMENT,
      Tree.Kind.DIVIDE_ASSIGNMENT,
      Tree.Kind.REMAINDER_ASSIGNMENT);
  }

}
