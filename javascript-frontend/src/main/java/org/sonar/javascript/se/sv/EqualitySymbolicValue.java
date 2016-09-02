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

import com.google.common.collect.ImmutableList;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class EqualitySymbolicValue extends RelationalSymbolicValue {

  private static final Set<Kind> STRICT_EQUALITY_KINDS = EnumSet.of(Kind.STRICT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO);
  protected static final Set<Kind> NEGATION_KINDS = EnumSet.of(Kind.NOT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO);

  private final Kind kind;
  private final SymbolicValue leftOperand;
  private final SymbolicValue rightOperand;

  EqualitySymbolicValue(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    super(kind, leftOperand, rightOperand);
    this.kind = kind;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
  }

  @Override
  public List<ProgramState> constrainDependencies(ProgramState incomingState, Constraint constraint) {
    List<ProgramState> constrainedStates = super.constrainDependencies(incomingState, constraint);
    constrainedStates = constrainOperand(leftOperand, rightOperand, constraint, constrainedStates);
    constrainedStates = constrainOperand(rightOperand, leftOperand, constraint, constrainedStates);
    return constrainedStates;
  }

  private List<ProgramState> constrainOperand(SymbolicValue sending, SymbolicValue receiving, Constraint constraint, List<ProgramState> incomingStates) {
    List<ProgramState> constrainedStates = new ArrayList<>();
    for (ProgramState state : incomingStates) {
      constrainedStates.addAll(constrainOperand(sending, receiving, state, constraint));
    }
    return constrainedStates;
  }

  private List<ProgramState> constrainOperand(SymbolicValue sending, SymbolicValue receiving, ProgramState state, Constraint constraint) {
    Constraint constraintOnSending = state.getConstraint(sending);
    if (constraintOnSending.isStricterOrEqualTo(Constraint.NULL_OR_UNDEFINED)) {
      if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
        return state.constrain(receiving, constraintOnNullOrUndefined(constraintOnSending));
      } else if (constraint.isStricterOrEqualTo(Constraint.FALSY)) {
        return state.constrain(receiving, constraintOnNullOrUndefined(constraintOnSending).not());
      }
    }
    return ImmutableList.of(state);
  }

  private Constraint constraintOnNullOrUndefined(Constraint constraintOnSending) {
    Constraint constraint = Constraint.NULL_OR_UNDEFINED;
    if (STRICT_EQUALITY_KINDS.contains(kind)) {
      constraint = constraintOnSending;
    }
    return NEGATION_KINDS.contains(kind) ? constraint.not() : constraint;
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    if (state.getConstraint(leftOperand).isIncompatibleWith(state.getConstraint(rightOperand))) {
      if (kind == Kind.STRICT_EQUAL_TO) {
        return Constraint.FALSE;
      }
      if (kind == Kind.STRICT_NOT_EQUAL_TO) {
        return Constraint.TRUE;
      }
    }
    return super.baseConstraint(state);
  }

}
