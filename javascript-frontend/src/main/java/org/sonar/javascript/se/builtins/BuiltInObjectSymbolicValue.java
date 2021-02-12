/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.se.builtins;

import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.annotation.Nullable;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.ObjectSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue.ArgumentsConstrainer;

import static org.sonar.javascript.se.Constraint.NAN;
import static org.sonar.javascript.se.Constraint.NULL;
import static org.sonar.javascript.se.Constraint.OTHER_OBJECT;
import static org.sonar.javascript.se.Constraint.TRUTHY;
import static org.sonar.javascript.se.Constraint.TRUTHY_NUMBER_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.UNDEFINED;
import static org.sonar.javascript.se.Constraint.ZERO;
import static org.sonar.javascript.se.builtins.BuiltInConstructorSymbolicValue.constructor;

public class BuiltInObjectSymbolicValue implements ObjectSymbolicValue {

  public static final BuiltInObjectSymbolicValue OBJECT_PROTOTYPE = create(ObjectBuiltInProperties.PROTOTYPE_PROPERTIES, null, Constraint.OTHER_OBJECT);
  public static final BuiltInObjectSymbolicValue FUNCTION_PROTOTYPE = create(FunctionBuiltInProperties.PROTOTYPE_PROPERTIES, OBJECT_PROTOTYPE, Constraint.FUNCTION);
  public static final BuiltInObjectSymbolicValue STRING_PROTOTYPE = create(StringBuiltInProperties.PROTOTYPE_PROPERTIES, OBJECT_PROTOTYPE, Constraint.STRING_OBJECT);
  public static final BuiltInObjectSymbolicValue NUMBER_PROTOTYPE = create(NumberBuiltInProperties.PROTOTYPE_PROPERTIES, OBJECT_PROTOTYPE, Constraint.NUMBER_OBJECT);
  public static final BuiltInObjectSymbolicValue BOOLEAN_PROTOTYPE = create(BooleanBuiltInProperties.PROTOTYPE_PROPERTIES, OBJECT_PROTOTYPE, Constraint.BOOLEAN_OBJECT);
  public static final BuiltInObjectSymbolicValue ARRAY_PROTOTYPE = create(ArrayBuiltInProperties.PROTOTYPE_PROPERTIES, OBJECT_PROTOTYPE, Constraint.ARRAY);
  public static final BuiltInObjectSymbolicValue DATE_PROTOTYPE = create(DateBuiltInProperties.PROTOTYPE_PROPERTIES, OBJECT_PROTOTYPE, Constraint.DATE);
  public static final BuiltInObjectSymbolicValue REGEXP_PROTOTYPE = create(RegexpBuiltInProperties.PROTOTYPE_PROPERTIES, OBJECT_PROTOTYPE, Constraint.REGEXP);

  public static final BuiltInObjectSymbolicValue MATH = create(MathBuiltInProperties.PROPERTIES, OBJECT_PROTOTYPE, Constraint.OTHER_OBJECT);

  public static final BuiltInConstructorSymbolicValue OBJECT = constructor(ObjectBuiltInProperties.PROPERTIES, Constraint.OTHER_OBJECT, OBJECT_PROTOTYPE);
  public static final BuiltInConstructorSymbolicValue FUNCTION = constructor(FunctionBuiltInProperties.PROPERTIES, Constraint.FUNCTION, FUNCTION_PROTOTYPE);
  public static final BuiltInConstructorSymbolicValue STRING = constructor(StringBuiltInProperties.PROPERTIES, Constraint.STRING_PRIMITIVE, STRING_PROTOTYPE);
  public static final BuiltInConstructorSymbolicValue NUMBER = constructor(NumberBuiltInProperties.PROPERTIES, Constraint.NUMBER_PRIMITIVE, NUMBER_PROTOTYPE);
  public static final BuiltInConstructorSymbolicValue BOOLEAN = constructor(BooleanBuiltInProperties.PROPERTIES, Constraint.BOOLEAN_PRIMITIVE, BOOLEAN_PROTOTYPE);
  public static final BuiltInConstructorSymbolicValue ARRAY = constructor(ArrayBuiltInProperties.PROPERTIES, Constraint.ARRAY, ARRAY_PROTOTYPE);
  public static final BuiltInConstructorSymbolicValue DATE = constructor(DateBuiltInProperties.PROPERTIES, Constraint.STRING_PRIMITIVE, DATE_PROTOTYPE);
  public static final BuiltInConstructorSymbolicValue REGEXP = constructor(RegexpBuiltInProperties.PROPERTIES, Constraint.REGEXP, REGEXP_PROTOTYPE);

  private static final ArgumentsConstrainer IS_NAN_ARGUMENT_CONSTRAINER = (List<SymbolicValue> arguments, ProgramState state, Constraint constraint) -> {
    boolean truthy = constraint.isStricterOrEqualTo(TRUTHY);
    boolean hasArguments = !arguments.isEmpty();

    Constraint alwaysNaN = UNDEFINED.or(NAN).or(Constraint.FUNCTION).or(Constraint.REGEXP).or(OTHER_OBJECT);
    Constraint alwaysNotNaN = NULL.or(ZERO).or(Constraint.EMPTY_STRING_PRIMITIVE).or(Constraint.ANY_BOOLEAN).or(TRUTHY_NUMBER_PRIMITIVE);

    if (truthy && hasArguments) {
      return state.constrain(arguments.get(0), alwaysNotNaN.not());

    } else if (truthy) {
      return Optional.of(state);

    } else if (!hasArguments) {
      return Optional.empty();

    } else {
      return state.constrain(arguments.get(0), alwaysNaN.not());
    }
  };

  public static final SymbolicValue IS_NAN = new BuiltInFunctionSymbolicValue(Constraint.BOOLEAN_PRIMITIVE, IS_NAN_ARGUMENT_CONSTRAINER,
    (int index) -> index == 0 ? Constraint.ANY_VALUE : null, false);

  private static final Map<String, SymbolicValue> GLOBALS = ImmutableMap.<String, SymbolicValue>builder()
    .put("Object", OBJECT)
    .put("Function", FUNCTION)
    .put("String", STRING)
    .put("Number", NUMBER)
    .put("Boolean", BOOLEAN)
    .put("Array", ARRAY)
    .put("Date", DATE)
    .put("RegExp", REGEXP)
    .put("Math", MATH)
    .put("isNaN", IS_NAN)
    .put("NaN", new SymbolicValueWithConstraint(Constraint.NAN))
    .build();

  private final Map<String, BuiltInProperty> properties;
  private final BuiltInObjectSymbolicValue prototype;
  private final Constraint baseConstraint;

  BuiltInObjectSymbolicValue(Map<String, BuiltInProperty> properties, @Nullable BuiltInObjectSymbolicValue prototype, Constraint baseConstraint) {
    this.properties = properties;
    this.prototype = prototype;
    this.baseConstraint = baseConstraint;
  }

  public static BuiltInObjectSymbolicValue create(Map<String, BuiltInProperty> properties, BuiltInObjectSymbolicValue prototype, Constraint baseConstraint) {
    return new BuiltInObjectSymbolicValue(properties, prototype, baseConstraint);
  }

  public static Optional<SymbolicValue> find(String name) {
    return Optional.ofNullable(GLOBALS.get(name));
  }

  public Constraint baseConstraint() {
    return baseConstraint;
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    return baseConstraint();
  }

  @Override
  public SymbolicValue getPropertyValue(String propertyName) {
    BuiltInProperty property = properties.get(propertyName);
    if (property != null) {
      return property.access();
    }
    if (prototype != null) {
      return prototype.getPropertyValue(propertyName);
    }
    return SpecialSymbolicValue.UNDEFINED;
  }

  public BuiltInObjectSymbolicValue prototype() {
    return prototype;
  }

}
