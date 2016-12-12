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
import java.util.function.IntFunction;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.sv.ObjectSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

import static org.sonar.javascript.se.Type.ONE_NUMBER;

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
      IntFunction<Constraint> numbersSignature = (int parameterIndex) -> Constraint.ANY_NUMBER;
      return ImmutableMap.<String, SymbolicValue>builder()
        .put("abs", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("acos", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("acosh", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("asin", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("asinh", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("atan", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("atanh", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("atan2", method(Constraint.NUMBER_PRIMITIVE, Type.NUMBER_NUMBER))
        .put("cbrt", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("ceil", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("clz32", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("cos", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("cosh", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("exp", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("expm1", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("floor", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("fround", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("hypot", method(Constraint.NUMBER_PRIMITIVE, numbersSignature))
        .put("imul", method(Constraint.NUMBER_PRIMITIVE, Type.NUMBER_NUMBER))
        .put("log", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("log1p", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("log10", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("log2", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("max", method(Constraint.NUMBER_PRIMITIVE, numbersSignature))
        .put("min", method(Constraint.NUMBER_PRIMITIVE, numbersSignature))
        .put("pow", method(Constraint.NUMBER_PRIMITIVE, Type.NUMBER_NUMBER))
        .put("random", method(Constraint.NUMBER_PRIMITIVE, Type.EMPTY))
        .put("round", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("sign", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("sin", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("sinh", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("sqrt", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("tan", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("tanh", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
        .put("trunc", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
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
