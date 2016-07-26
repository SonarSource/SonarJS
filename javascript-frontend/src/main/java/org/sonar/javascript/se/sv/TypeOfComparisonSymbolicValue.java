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
import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
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
    .put("object", Constraint.NULL.or(Constraint.OTHER_OBJECT).or(Constraint.ARRAY))
    .put("number", Constraint.NUMBER)
    .put("string", Constraint.STRING)
    .put("boolean", Constraint.BOOLEAN)
    .put("symbol", Constraint.OTHER_OBJECT)
    .build();

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

  private TypeOfComparisonSymbolicValue(TypeOfSymbolicValue typeOfOperand, String comparedTypeString) {
    Preconditions.checkArgument(typeOfOperand != null, "operandValue should not be null");
    Preconditions.checkArgument(comparedTypeString != null, "comparedTypeString should not be null");
    this.typeOfOperand = typeOfOperand;
    this.comparedTypeString = comparedTypeString;
  }

  @Override
  public List<ProgramState> constrain(ProgramState state, Constraint constraint) {
    Constraint truthyConstraint = TYPEOF_EQUAL_CONSTRAINTS.get(comparedTypeString);

    if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
      return truthyConstraint != null ? typeOfOperand.constrain(state, truthyConstraint) : ImmutableList.of();

    } else if (constraint.isStricterOrEqualTo(Constraint.FALSY) && truthyConstraint != null) {
      return typeOfOperand.constrain(state, truthyConstraint.not());

    }

    return ImmutableList.of(state);
  }

  @Override
  public String toString() {
    return typeOfOperand + " == '" + comparedTypeString + "'";
  }
}
