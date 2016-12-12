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

import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class EqualitySymbolicValue extends RelationalSymbolicValue {

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
  public Optional<ProgramState> constrainDependencies(ProgramState incomingState, Constraint constraint) {
    Optional<ProgramState> constrainedState = super.constrainDependencies(incomingState, constraint);
    constrainedState = constrainOperand(leftOperand, rightOperand, constraint, constrainedState.orElse(null));
    constrainedState = constrainOperand(rightOperand, leftOperand, constraint, constrainedState.orElse(null));
    return constrainedState;
  }

  private Optional<ProgramState> constrainOperand(SymbolicValue sending, SymbolicValue receiving, Constraint constraint, @Nullable ProgramState incomingState) {
    if (incomingState != null) {
      return constrainOperand(sending, receiving, incomingState, constraint);
    }
    return Optional.empty();
  }

  private Optional<ProgramState> constrainOperand(SymbolicValue sending, SymbolicValue receiving, ProgramState state, Constraint constraint) {
    Constraint constraintOnSending = state.getConstraint(sending);

    if (constraintOnSending.isStricterOrEqualTo(Constraint.NULL_OR_UNDEFINED)) {
      if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
        return state.constrain(receiving, constraintOnNullOrUndefined(constraintOnSending, false));
      } else if (constraint.isStricterOrEqualTo(Constraint.FALSY)) {
        return state.constrain(receiving, constraintOnNullOrUndefined(constraintOnSending, true));
      }
    }

    if (Kind.STRICT_EQUAL_TO.equals(kind) && constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
      return state.constrain(receiving, constraintOnSending);
    }

    if (Kind.STRICT_NOT_EQUAL_TO.equals(kind) && constraint.isStricterOrEqualTo(Constraint.FALSY)) {
      return state.constrain(receiving, constraintOnSending);
    }

    return Optional.of(state);
  }

  private Constraint constraintOnNullOrUndefined(Constraint constraintOnSending, boolean negate) {
    Constraint constraint;
    if (Kind.STRICT_EQUAL_TO.equals(kind)) {
      constraint = constraintOnSending;
    } else if (Kind.STRICT_NOT_EQUAL_TO.equals(kind)) {
      if (Constraint.NULL_OR_UNDEFINED.equals(constraintOnSending)) {
        return Constraint.ANY_VALUE;
      }
      constraint = constraintOnSending.not();
    } else if (Kind.EQUAL_TO.equals(kind)) {
      constraint = Constraint.NULL_OR_UNDEFINED;
    } else {
      constraint = Constraint.NULL_OR_UNDEFINED.not();
    }
    return negate ? constraint.not() : constraint;
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
