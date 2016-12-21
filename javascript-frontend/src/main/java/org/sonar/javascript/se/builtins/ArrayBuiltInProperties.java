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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
import java.util.function.IntFunction;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.sv.SymbolicValue;

import static org.sonar.javascript.se.Constraint.ANY_NUMBER;
import static org.sonar.javascript.se.Constraint.ANY_VALUE;
import static org.sonar.javascript.se.Constraint.ARRAY;
import static org.sonar.javascript.se.Constraint.FUNCTION;
import static org.sonar.javascript.se.Constraint.OBJECT;
import static org.sonar.javascript.se.Constraint.UNDEFINED;

public class ArrayBuiltInProperties extends BuiltInProperties {

  @Override
  Map<String, SymbolicValue> getMethods() {
    List<Constraint> functionAndObject = ImmutableList.of(FUNCTION, OBJECT);
    List<Constraint> anyValueAndNumber = ImmutableList.of(ANY_VALUE, ANY_NUMBER);
    IntFunction<Constraint> anyValues = (int index) -> ANY_VALUE;

    return ImmutableMap.<String, SymbolicValue>builder()
      .put("copyWithin", method(Constraint.ARRAY, ImmutableList.of(Constraint.ANY_NUMBER, Constraint.ANY_NUMBER, Constraint.ANY_NUMBER), true))
      .put("fill", method(Constraint.ARRAY, ImmutableList.of(ANY_VALUE, ANY_NUMBER, ANY_NUMBER), true))
      .put("push", method(Constraint.NUMBER_PRIMITIVE, anyValues, true))
      .put("reverse", method(Constraint.ARRAY, Type.EMPTY, true))
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
      .put("join", method(Constraint.STRING_PRIMITIVE, Type.ONE_STRING))
      .put("slice", method(Constraint.ARRAY, Type.NUMBER_NUMBER))
      .put("indexOf", method(Constraint.NUMBER_PRIMITIVE, anyValueAndNumber))
      .put("lastIndexOf", method(Constraint.NUMBER_PRIMITIVE, anyValueAndNumber))

      .put("forEach", method(UNDEFINED, functionAndObject, true))
      .put("entries", method(Constraint.OTHER_OBJECT, Type.EMPTY))
      .put("every", method(Constraint.BOOLEAN_PRIMITIVE, functionAndObject))
      .put("some", method(Constraint.BOOLEAN_PRIMITIVE, functionAndObject))
      .put("filter", method(Constraint.ARRAY, functionAndObject))
      .put("findIndex", method(Constraint.NUMBER_PRIMITIVE, functionAndObject))
      .put("keys", method(Constraint.OTHER_OBJECT, Type.EMPTY))
      .put("map", method(Constraint.ARRAY, functionAndObject))
      .put("values", method(Constraint.OTHER_OBJECT, Type.EMPTY))

      .put("pop", method(ANY_VALUE, Type.EMPTY, true))
      .put("shift", method(ANY_VALUE, Type.EMPTY, true))
      .put("find", method(ANY_VALUE, functionAndObject))
      .put("reduce", method(ANY_VALUE, ImmutableList.of(FUNCTION, Constraint.ANY_VALUE)))
      .put("reduceRight", method(ANY_VALUE, ImmutableList.of(FUNCTION, Constraint.ANY_VALUE)))

      // overrides Object
      .put("toString", method(Constraint.STRING_PRIMITIVE, Type.EMPTY))
      .put("toLocaleString", method(Constraint.STRING_PRIMITIVE, Type.EMPTY))
      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.of(
      "length", Constraint.NUMBER_PRIMITIVE
    );
  }

  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.of();
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("from", method(Constraint.ARRAY, ImmutableList.of(ANY_VALUE, FUNCTION, ANY_VALUE)))
      .put("isArray", method(Constraint.BOOLEAN_PRIMITIVE, BuiltInProperties.getIsSomethingArgumentsConstrainer(ARRAY), ImmutableList.of(ANY_VALUE)))
      .put("of", method(Constraint.ARRAY, (int index) -> ANY_VALUE))
      .build();
  }
}
