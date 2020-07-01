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
package org.sonar.javascript.se.builtins;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
import java.util.function.IntFunction;
import org.sonar.javascript.se.Constraint;

import static org.sonar.javascript.se.Constraint.ANY_NUMBER;
import static org.sonar.javascript.se.Constraint.ANY_VALUE;
import static org.sonar.javascript.se.Constraint.ARRAY;
import static org.sonar.javascript.se.Constraint.FUNCTION;
import static org.sonar.javascript.se.Constraint.OBJECT;
import static org.sonar.javascript.se.Constraint.UNDEFINED;
import static org.sonar.javascript.se.Constraint.ZERO;
import static org.sonar.javascript.se.builtins.BuiltInProperty.method;
import static org.sonar.javascript.se.builtins.BuiltInProperty.property;

public class ArrayBuiltInProperties {

  private static final List<Constraint> functionAndObject = ImmutableList.of(FUNCTION, OBJECT);
  private static final List<Constraint> anyValueAndNumber = ImmutableList.of(ANY_VALUE, ANY_NUMBER);
  private static final IntFunction<Constraint> anyValues = (int index) -> ANY_VALUE;

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("copyWithin", method(Constraint.ARRAY, ImmutableList.of(Constraint.ANY_NUMBER, Constraint.ANY_NUMBER, Constraint.ANY_NUMBER), true))
    .put("fill", method(Constraint.ARRAY, ImmutableList.of(ANY_VALUE, ANY_NUMBER, ANY_NUMBER), true))
    .put("push", method(Constraint.NUMBER_PRIMITIVE, anyValues, true))
    .put("reverse", method(Constraint.ARRAY, BuiltInProperty.EMPTY, true))
    .put("sort", method(Constraint.ARRAY, ImmutableList.of(FUNCTION), true))
    .put("splice", method(Constraint.ARRAY, (int index) -> {
      if (index == 0 || index == 1) {
        return ANY_NUMBER;
      } else {
        return ANY_VALUE;
      }
    }, true))
    .put("unshift", method(Constraint.NUMBER_PRIMITIVE, anyValues, true))
    .put("concat", method(Constraint.ARRAY, anyValues))
    .put("includes", method(Constraint.BOOLEAN_PRIMITIVE, anyValueAndNumber))
    .put("join", method(Constraint.STRING_PRIMITIVE, BuiltInProperty.ONE_STRING))
    .put("slice", method(Constraint.ARRAY, BuiltInProperty.NUMBER_NUMBER))
    .put("indexOf", method(Constraint.NUMBER_PRIMITIVE, anyValueAndNumber))
    .put("lastIndexOf", method(Constraint.NUMBER_PRIMITIVE, anyValueAndNumber))

    .put("forEach", method(UNDEFINED, functionAndObject, true))
    .put("entries", method(Constraint.OTHER_OBJECT, BuiltInProperty.EMPTY))
    .put("every", method(Constraint.BOOLEAN_PRIMITIVE, functionAndObject))
    .put("some", method(Constraint.BOOLEAN_PRIMITIVE, functionAndObject))
    .put("filter", method(Constraint.ARRAY, functionAndObject))
    .put("findIndex", method(Constraint.NUMBER_PRIMITIVE, functionAndObject))
    .put("keys", method(Constraint.OTHER_OBJECT, BuiltInProperty.EMPTY))
    .put("map", method(Constraint.ARRAY, functionAndObject))
    .put("values", method(Constraint.OTHER_OBJECT, BuiltInProperty.EMPTY))

    .put("pop", method(ANY_VALUE, BuiltInProperty.EMPTY, true))
    .put("shift", method(ANY_VALUE, BuiltInProperty.EMPTY, true))
    .put("find", method(ANY_VALUE, functionAndObject))
    .put("reduce", method(ANY_VALUE, ImmutableList.of(FUNCTION, Constraint.ANY_VALUE)))
    .put("reduceRight", method(ANY_VALUE, ImmutableList.of(FUNCTION, Constraint.ANY_VALUE)))

    // overrides Object
    .put("toString", method(Constraint.STRING_PRIMITIVE, BuiltInProperty.EMPTY))
    .put("toLocaleString", method(Constraint.STRING_PRIMITIVE, BuiltInProperty.EMPTY))
    .put("length", property(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(ZERO)))
    .build();

  public static final Map<String, BuiltInProperty> PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("from", method(Constraint.ARRAY, ImmutableList.of(ANY_VALUE, FUNCTION, ANY_VALUE)))
    .put("isArray", method(Constraint.BOOLEAN_PRIMITIVE, BuiltInProperty.getIsSomethingArgumentsConstrainer(ARRAY), ImmutableList.of(ANY_VALUE)))
    .put("of", method(Constraint.ARRAY, (int index) -> ANY_VALUE))
    .build();

  private ArrayBuiltInProperties() {
  }

}
