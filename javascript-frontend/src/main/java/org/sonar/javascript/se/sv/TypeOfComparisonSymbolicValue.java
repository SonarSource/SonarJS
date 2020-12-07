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

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableMap;
import java.util.Map;
import java.util.Optional;
import javax.annotation.CheckForNull;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

/**
 * This class represents symbolic value for typical comparison of "typeof <some expression>" with string literal.
 * E.g.
 * <pre>typeof foo.bar() != "string"</pre>
 * <pre>typeof x == "object"</pre>
 */
public class TypeOfComparisonSymbolicValue implements SymbolicValue {

  private final TypeOfSymbolicValue typeOfOperand;

  private final String comparedTypeString;

  private static final Map<String, Constraint> TYPEOF_EQUAL_CONSTRAINTS = ImmutableMap.<String, Constraint>builder()
    .put("undefined", Constraint.UNDEFINED)
    .put("function", Constraint.FUNCTION)
    .put("object", Constraint.OBJECT.and(Constraint.FUNCTION.not()).or(Constraint.NULL))
    .put("number", Constraint.NUMBER_PRIMITIVE)
    .put("string", Constraint.STRING_PRIMITIVE)
    .put("boolean", Constraint.BOOLEAN_PRIMITIVE)
    .put("symbol", Constraint.OTHER_OBJECT)
    // on IE, operator typeof returns either one of the standard values above, or "date", or "unknown"
    .put("date", Constraint.ANY_VALUE)
    .put("unknown", Constraint.ANY_VALUE)
    .build();

  private TypeOfComparisonSymbolicValue(TypeOfSymbolicValue typeOfOperand, String comparedTypeString) {
    Preconditions.checkArgument(typeOfOperand != null, "operandValue should not be null");
    Preconditions.checkArgument(comparedTypeString != null, "comparedTypeString should not be null");
    this.typeOfOperand = typeOfOperand;
    this.comparedTypeString = comparedTypeString;
  }

  @CheckForNull
  public static TypeOfComparisonSymbolicValue create(SymbolicValue operand1, SymbolicValue operand2) {
    TypeOfComparisonSymbolicValue typeOfComparison = createTypeOfComparison(operand1, operand2);
    if (typeOfComparison == null) {
      typeOfComparison = createTypeOfComparison(operand2, operand1);
    }
    return typeOfComparison;
  }

  @CheckForNull
  private static TypeOfComparisonSymbolicValue createTypeOfComparison(SymbolicValue operand1, SymbolicValue operand2) {
    if (operand1 instanceof TypeOfSymbolicValue && operand2 instanceof LiteralSymbolicValue) {
      LiteralTree literal = ((LiteralSymbolicValue) operand2).getLiteral();
      if (literal.is(Kind.STRING_LITERAL)) {
        return new TypeOfComparisonSymbolicValue((TypeOfSymbolicValue) operand1, literal.value().substring(1, literal.value().length() - 1));
      }
    }

    return null;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    Constraint truthyConstraint = TYPEOF_EQUAL_CONSTRAINTS.get(comparedTypeString);

    if (truthyConstraint == null  || !truthyConstraint.equals(Constraint.ANY_VALUE)) {
      if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
        return truthyConstraint != null ? state.constrain(typeOfOperand.operandValue(), truthyConstraint) : Optional.empty();
      } else if (constraint.isStricterOrEqualTo(Constraint.FALSY) && truthyConstraint != null) {
        return state.constrain(typeOfOperand.operandValue(), truthyConstraint.not());
      }
    }

    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    return Constraint.BOOLEAN_PRIMITIVE;
  }

  @Override
  public String toString() {
    return typeOfOperand + " == '" + comparedTypeString + "'";
  }

}
