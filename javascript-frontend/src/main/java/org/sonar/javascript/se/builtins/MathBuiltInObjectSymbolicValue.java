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
        .put("E", Constraint.TRUTHY_NUMBER)
        .put("LN2", Constraint.TRUTHY_NUMBER)
        .put("LN10", Constraint.TRUTHY_NUMBER)
        .put("LOG2E", Constraint.TRUTHY_NUMBER)
        .put("LOG10E", Constraint.TRUTHY_NUMBER)
        .put("PI", Constraint.TRUTHY_NUMBER)
        .put("SQRT1_2", Constraint.TRUTHY_NUMBER)
        .put("SQRT2", Constraint.TRUTHY_NUMBER)
        .build();
    }

    @Override
    Map<String, SymbolicValue> getOwnMethods() {
      return ImmutableMap.<String, SymbolicValue>builder()
        .put("abs", method(Constraint.NUMBER))
        .put("acos", method(Constraint.NUMBER))
        .put("acosh", method(Constraint.NUMBER))
        .put("asin", method(Constraint.NUMBER))
        .put("asinh", method(Constraint.NUMBER))
        .put("atan", method(Constraint.NUMBER))
        .put("atanh", method(Constraint.NUMBER))
        .put("atan2", method(Constraint.NUMBER))
        .put("cbrt", method(Constraint.NUMBER))
        .put("ceil", method(Constraint.NUMBER))
        .put("clz32", method(Constraint.NUMBER))
        .put("cos", method(Constraint.NUMBER))
        .put("cosh", method(Constraint.NUMBER))
        .put("exp", method(Constraint.NUMBER))
        .put("expm1", method(Constraint.NUMBER))
        .put("floor", method(Constraint.NUMBER))
        .put("fround", method(Constraint.NUMBER))
        .put("hypot", method(Constraint.NUMBER))
        .put("imul", method(Constraint.NUMBER))
        .put("log", method(Constraint.NUMBER))
        .put("log1p", method(Constraint.NUMBER))
        .put("log10", method(Constraint.NUMBER))
        .put("log2", method(Constraint.NUMBER))
        .put("max", method(Constraint.NUMBER))
        .put("min", method(Constraint.NUMBER))
        .put("pow", method(Constraint.NUMBER))
        .put("random", method(Constraint.NUMBER))
        .put("round", method(Constraint.NUMBER))
        .put("sign", method(Constraint.NUMBER))
        .put("sin", method(Constraint.NUMBER))
        .put("sinh", method(Constraint.NUMBER))
        .put("sqrt", method(Constraint.NUMBER))
        .put("tan", method(Constraint.NUMBER))
        .put("tanh", method(Constraint.NUMBER))
        .put("trunc", method(Constraint.NUMBER))
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
