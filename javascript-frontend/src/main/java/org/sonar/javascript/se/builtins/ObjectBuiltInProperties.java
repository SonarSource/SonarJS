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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import java.util.Map;
import org.sonar.javascript.se.Constraint;

import static org.sonar.javascript.se.builtins.BuiltInProperty.method;
import static org.sonar.javascript.se.builtins.BuiltInProperty.property;

public class ObjectBuiltInProperties {

  private static final ImmutableList<Constraint> oneObject = ImmutableList.of(Constraint.OBJECT);

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES =
    ImmutableMap.<String, BuiltInProperty>builder()
      .put("__defineGetter__", method(Constraint.UNDEFINED, ImmutableList.of(Constraint.ANY_STRING, Constraint.FUNCTION), true))
      .put("__defineSetter__", method(Constraint.UNDEFINED, ImmutableList.of(Constraint.ANY_STRING, Constraint.FUNCTION), true))
      .put("__lookupGetter__", method(Constraint.FUNCTION, ImmutableList.of(Constraint.ANY_STRING)))
      .put("__lookupSetter__", method(Constraint.FUNCTION, ImmutableList.of(Constraint.ANY_STRING)))
      .put("hasOwnProperty", method(Constraint.BOOLEAN_PRIMITIVE, ImmutableList.of(Constraint.ANY_VALUE)))
      .put("isPrototypeOf", method(Constraint.BOOLEAN_PRIMITIVE, ImmutableList.of(Constraint.OBJECT)))
      .put("propertyIsEnumerable", method(Constraint.BOOLEAN_PRIMITIVE, ImmutableList.of(Constraint.ANY_VALUE)))
      .put("toLocaleString", method(Constraint.STRING_PRIMITIVE, BuiltInProperty.EMPTY))
      .put("toString", method(Constraint.STRING_PRIMITIVE, BuiltInProperty.EMPTY))
      .put("valueOf", method(Constraint.ANY_VALUE, BuiltInProperty.EMPTY))
      .put("constructor", property(Constraint.ANY_VALUE))
      .put("__proto__", property(Constraint.OBJECT.or(Constraint.NULL)))

      // Provided by Should.js assertion framework, not part of ES specification
      .put("should", property(Constraint.ANY_VALUE))

      .build();

  public static final Map<String, BuiltInProperty> PROPERTIES =
    ImmutableMap.<String, BuiltInProperty>builder()
      .put("assign", method(Constraint.OBJECT, (int index) -> Constraint.OBJECT, true))
      .put("create", method(Constraint.OBJECT, ImmutableList.of(Constraint.OBJECT.or(Constraint.NULL), Constraint.OBJECT)))
      .put("defineProperty", method(Constraint.OBJECT, ImmutableList.of(Constraint.OBJECT, Constraint.ANY_VALUE, Constraint.OBJECT), true))
      .put("defineProperties", method(Constraint.OBJECT, ImmutableList.of(Constraint.OBJECT, Constraint.OBJECT), true))
      .put("entries", method(Constraint.ARRAY, oneObject))
      .put("freeze", method(Constraint.OBJECT, oneObject, true))
      .put("getOwnPropertyDescriptor", method(Constraint.OBJECT.or(Constraint.UNDEFINED), ImmutableList.of(Constraint.OBJECT, Constraint.ANY_VALUE)))
      .put("getOwnPropertyDescriptors", method(Constraint.OBJECT, oneObject))
      .put("getOwnPropertyNames", method(Constraint.ARRAY, oneObject))
      .put("getOwnPropertySymbols", method(Constraint.ARRAY, oneObject))
      .put("getPrototypeOf", method(Constraint.OBJECT.or(Constraint.NULL), oneObject))
      .put("is", method(Constraint.BOOLEAN_PRIMITIVE, ImmutableList.of(Constraint.ANY_VALUE, Constraint.ANY_VALUE)))
      .put("isExtensible", method(Constraint.BOOLEAN_PRIMITIVE, oneObject))
      .put("isFrozen", method(Constraint.BOOLEAN_PRIMITIVE, oneObject))
      .put("isSealed", method(Constraint.BOOLEAN_PRIMITIVE, oneObject))
      .put("keys", method(Constraint.ARRAY, oneObject))
      .put("preventExtensions", method(Constraint.OBJECT, oneObject, true))
      .put("seal", method(Constraint.OBJECT, oneObject, true))
      .put("setPrototypeOf", method(Constraint.OBJECT, ImmutableList.of(Constraint.OBJECT, Constraint.OBJECT.or(Constraint.NULL)), true))
      .put("values", method(Constraint.ARRAY, oneObject))
      .build();

  private ObjectBuiltInProperties() {
  }

}
