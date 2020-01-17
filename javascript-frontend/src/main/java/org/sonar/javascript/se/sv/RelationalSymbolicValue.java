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
package org.sonar.javascript.se.sv;

import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Relation;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class RelationalSymbolicValue implements SymbolicValue {

  private final Relation relationWhenTrue;

  RelationalSymbolicValue(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    this.relationWhenTrue = new Relation(kind, leftOperand, rightOperand);
  }

  public static SymbolicValue create(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    if (KindSet.EQUALITY_KINDS.getSubKinds().contains(kind)) {
      return createEquality(kind, leftOperand, rightOperand);
    }
    return new RelationalSymbolicValue(kind, leftOperand, rightOperand);
  }

  private static SymbolicValue createEquality(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    SymbolicValue typeOfComparison = TypeOfComparisonSymbolicValue.create(leftOperand, rightOperand);
    if (typeOfComparison != null) {
      return EqualitySymbolicValue.EQUALITY_NEGATION_KINDS.contains(kind) ? LogicalNotSymbolicValue.create(typeOfComparison) : typeOfComparison;
    }
    return new EqualitySymbolicValue(kind, leftOperand, rightOperand);
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
      return checkRelationsAndConstrain(state, relationWhenTrue);

    } else if (constraint.isStricterOrEqualTo(Constraint.FALSY)) {
      return checkRelationsAndConstrain(state, relationWhenTrue.not());

    }
    return Optional.of(state);
  }

  private static Optional<ProgramState> checkRelationsAndConstrain(ProgramState state, Relation relation) {
    for (Relation existingRelation : state.relations()) {
      if (!relation.isCompatibleWith(existingRelation)) {
        return Optional.empty();
      }
    }
    return Optional.of(state.addRelation(relation));
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    Optional<Boolean> result = relationWhenTrue.applyNumericComparison(state);
    if (result.isPresent()) {
      return result.get() ? Constraint.TRUE : Constraint.FALSE;
    }

    return Constraint.BOOLEAN_PRIMITIVE;
  }

  public Relation relationWhenTrue() {
    return relationWhenTrue;
  }

  @Override
  public String toString() {
    return relationWhenTrue.toString();
  }

}
