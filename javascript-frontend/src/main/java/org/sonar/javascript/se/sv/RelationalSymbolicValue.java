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
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Relation;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class RelationalSymbolicValue implements SymbolicValue {

  private static final Set<Kind> EQUALITY_KINDS = EnumSet.of(
    Kind.EQUAL_TO,
    Kind.NOT_EQUAL_TO,
    Kind.STRICT_EQUAL_TO,
    Kind.STRICT_NOT_EQUAL_TO);

  private final Relation relationWhenTrue;

  RelationalSymbolicValue(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    this.relationWhenTrue = new Relation(kind, leftOperand, rightOperand);
  }

  public static SymbolicValue create(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    if (EQUALITY_KINDS.contains(kind)) {
      return createEquality(kind, leftOperand, rightOperand);
    }
    return new RelationalSymbolicValue(kind, leftOperand, rightOperand);
  }

  private static SymbolicValue createEquality(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    SymbolicValue typeOfComparison = TypeOfComparisonSymbolicValue.create(leftOperand, rightOperand);
    if (typeOfComparison != null) {
      return EqualitySymbolicValue.NEGATION_KINDS.contains(kind) ? LogicalNotSymbolicValue.create(typeOfComparison) : typeOfComparison;
    }
    return new EqualitySymbolicValue(kind, leftOperand, rightOperand);
  }

  @Override
  public List<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
      return checkRelationsAndConstrain(state, relationWhenTrue);

    } else if (constraint.isStricterOrEqualTo(Constraint.FALSY)) {
      return checkRelationsAndConstrain(state, relationWhenTrue.not());

    }
    return ImmutableList.of(state);
  }

  private static List<ProgramState> checkRelationsAndConstrain(ProgramState state, Relation relation) {
    for (Relation existingRelation : state.relations()) {
      if (!relation.isCompatibleWith(existingRelation)) {
        return ImmutableList.of();
      }
    }
    return ImmutableList.of(state.addRelation(relation));
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    return Constraint.BOOLEAN;
  }

  public Relation relationWhenTrue() {
    return relationWhenTrue;
  }

  @Override
  public String toString() {
    return relationWhenTrue.toString();
  }

}
