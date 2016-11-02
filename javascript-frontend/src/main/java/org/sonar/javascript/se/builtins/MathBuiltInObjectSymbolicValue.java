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
package org.sonar.javascript.se.builtins;

import com.google.common.collect.ImmutableMap;
import java.util.Map;
import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.ObjectSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

public class MathBuiltInObjectSymbolicValue implements ObjectSymbolicValue {

  private static final BuiltInProperties PROPERTIES = new MathBuiltInProperties();

  private static class MathBuiltInProperties extends BuiltInProperties {

    @Override
    Map<String, Constraint> getPropertiesConstraints() {
      throw new IllegalStateException("Math is not function object, so it can't be instantiated.");
    }

    @Override
    Map<String, SymbolicValue> getMethods() {
      throw new IllegalStateException("Math is not function object, so it can't be instantiated.");
    }

    @Override
    Map<String, Constraint> getOwnPropertiesConstraints() {
      return ImmutableMap.<String, Constraint>builder()
        .put("E", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .put("LN2", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .put("LN10", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .put("LOG2E", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .put("LOG10E", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .put("PI", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .put("SQRT1_2", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .put("SQRT2", Constraint.TRUTHY_NUMBER_PRIMITIVE)
        .build();
    }

    @Override
    Map<String, SymbolicValue> getOwnMethods() {
      return ImmutableMap.<String, SymbolicValue>builder()
        .put("abs", method(Constraint.NUMBER_PRIMITIVE))
        .put("acos", method(Constraint.NUMBER_PRIMITIVE))
        .put("acosh", method(Constraint.NUMBER_PRIMITIVE))
        .put("asin", method(Constraint.NUMBER_PRIMITIVE))
        .put("asinh", method(Constraint.NUMBER_PRIMITIVE))
        .put("atan", method(Constraint.NUMBER_PRIMITIVE))
        .put("atanh", method(Constraint.NUMBER_PRIMITIVE))
        .put("atan2", method(Constraint.NUMBER_PRIMITIVE))
        .put("cbrt", method(Constraint.NUMBER_PRIMITIVE))
        .put("ceil", method(Constraint.NUMBER_PRIMITIVE))
        .put("clz32", method(Constraint.NUMBER_PRIMITIVE))
        .put("cos", method(Constraint.NUMBER_PRIMITIVE))
        .put("cosh", method(Constraint.NUMBER_PRIMITIVE))
        .put("exp", method(Constraint.NUMBER_PRIMITIVE))
        .put("expm1", method(Constraint.NUMBER_PRIMITIVE))
        .put("floor", method(Constraint.NUMBER_PRIMITIVE))
        .put("fround", method(Constraint.NUMBER_PRIMITIVE))
        .put("hypot", method(Constraint.NUMBER_PRIMITIVE))
        .put("imul", method(Constraint.NUMBER_PRIMITIVE))
        .put("log", method(Constraint.NUMBER_PRIMITIVE))
        .put("log1p", method(Constraint.NUMBER_PRIMITIVE))
        .put("log10", method(Constraint.NUMBER_PRIMITIVE))
        .put("log2", method(Constraint.NUMBER_PRIMITIVE))
        .put("max", method(Constraint.NUMBER_PRIMITIVE))
        .put("min", method(Constraint.NUMBER_PRIMITIVE))
        .put("pow", method(Constraint.NUMBER_PRIMITIVE))
        .put("random", method(Constraint.NUMBER_PRIMITIVE))
        .put("round", method(Constraint.NUMBER_PRIMITIVE))
        .put("sign", method(Constraint.NUMBER_PRIMITIVE))
        .put("sin", method(Constraint.NUMBER_PRIMITIVE))
        .put("sinh", method(Constraint.NUMBER_PRIMITIVE))
        .put("sqrt", method(Constraint.NUMBER_PRIMITIVE))
        .put("tan", method(Constraint.NUMBER_PRIMITIVE))
        .put("tanh", method(Constraint.NUMBER_PRIMITIVE))
        .put("trunc", method(Constraint.NUMBER_PRIMITIVE))
        .build();
    }
  }

  @Override
  public Optional<SymbolicValue> getValueForOwnProperty(String name) {
    Constraint constraint = PROPERTIES.getOwnPropertiesConstraints().get(name);
    if (constraint != null) {
      return Optional.of(new SymbolicValueWithConstraint(constraint));
    }

    SymbolicValue value = PROPERTIES.getOwnMethods().get(name);
    if (value != null) {
      return Optional.of(value);
    }

    return Optional.empty();
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    return Constraint.OTHER_OBJECT;
  }
}
