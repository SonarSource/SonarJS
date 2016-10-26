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
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.sv.SymbolicValue;

public class ObjectBuiltInProperties extends BuiltInProperties {

  @Override
  Map<String, SymbolicValue> getMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("hasOwnProperty", method(Constraint.BOOLEAN))
      .put("isPrototypeOf", method(Constraint.BOOLEAN))
      .put("propertyIsEnumerable", method(Constraint.BOOLEAN))
      .put("toLocaleString", method(Constraint.STRING))
      .put("toString", method(Constraint.STRING))
      .put("valueOf", method(Constraint.ANY_VALUE))
      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.of(
      "constructor", Constraint.FUNCTION
    );
  }

  @Override
  protected BuiltInProperties getPrototypeProperties() {
    return null;
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("assign", method(Constraint.OBJECT))
      .put("create", method(Constraint.OBJECT))
      .put("defineProperty", method(Constraint.OBJECT))
      .put("defineProperties", method(Constraint.OBJECT))
      .put("freeze", method(Constraint.OBJECT))
      .put("getOwnPropertyDescriptor", method(Constraint.OBJECT.or(Constraint.UNDEFINED)))
      .put("getOwnPropertyDescriptors", method(Constraint.OBJECT))
      .put("getOwnPropertyNames", method(Constraint.ARRAY))
      .put("getOwnPropertySymbols", method(Constraint.ARRAY))
      .put("getPrototypeOf", method(Constraint.OBJECT.or(Constraint.NULL)))
      .put("is", method(Constraint.BOOLEAN))
      .put("isExtensible", method(Constraint.BOOLEAN))
      .put("isFrozen", method(Constraint.BOOLEAN))
      .put("isSealed", method(Constraint.BOOLEAN))
      .put("keys", method(Constraint.ARRAY))
      .put("preventExtensions", method(Constraint.OBJECT))
      .put("seal", method(Constraint.OBJECT))
      .put("setPrototypeOf()", method(Constraint.OBJECT))
      .build();
  }

  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.of();
  }
}
