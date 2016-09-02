/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.se.sv;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;

/**
 * This class represents symbolic value for binary "+" expression.
 * E.g.
 * <pre>x + y</pre>
 * <pre>"str" + foo</pre>
 */
public class PlusSymbolicValue implements SymbolicValue {

  private final SymbolicValue firstOperandValue;
  private final SymbolicValue secondOperandValue;

  public PlusSymbolicValue(SymbolicValue firstOperandValue, SymbolicValue secondOperandValue) {
    Preconditions.checkArgument(firstOperandValue != null, "operand value should not be null");
    Preconditions.checkArgument(secondOperandValue != null, "operand value should not be null");
    this.firstOperandValue = firstOperandValue;
    this.secondOperandValue = secondOperandValue;
  }

  @Override
  public List<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return ImmutableList.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    Set<Type> numberTypes = EnumSet.of(Type.NUMBER, Type.BOOLEAN);

    Type firstType = state.getConstraint(firstOperandValue).type();
    Type secondType = state.getConstraint(secondOperandValue).type();

    if (firstType != null || secondType != null) {
      if (firstType == Type.STRING || secondType == Type.STRING) {
        return Constraint.STRING;

      } else if (numberTypes.contains(firstType) && numberTypes.contains(secondType)) {
        return Constraint.NUMBER;
      }
    }
    return Constraint.NUMBER.or(Constraint.STRING);
  }

  @Override
  public String toString() {
    return firstOperandValue + " + " + secondOperandValue;
  }
}
