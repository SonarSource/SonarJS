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

public class DateBuiltInProperties extends BuiltInProperties {

  @Override
  Map<String, SymbolicValue> getMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("getDate", method(Constraint.TRUTHY_NUMBER_PRIMITIVE))
      .put("getDay", method(Constraint.NUMBER_PRIMITIVE))
      .put("getFullYear", method(Constraint.NUMBER_PRIMITIVE))
      .put("getHours", method(Constraint.NUMBER_PRIMITIVE))
      .put("getMilliseconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("getMinutes", method(Constraint.NUMBER_PRIMITIVE))
      .put("getMonth", method(Constraint.NUMBER_PRIMITIVE))
      .put("getSeconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("getTime", method(Constraint.NUMBER_PRIMITIVE))
      .put("getTimezoneOffset", method(Constraint.NUMBER_PRIMITIVE))
      .put("getUTCDate", method(Constraint.TRUTHY_NUMBER_PRIMITIVE))
      .put("getUTCDay", method(Constraint.NUMBER_PRIMITIVE))
      .put("getUTCFullYear", method(Constraint.NUMBER_PRIMITIVE))
      .put("getUTCHours", method(Constraint.NUMBER_PRIMITIVE))
      .put("getUTCMilliseconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("getUTCMinutes", method(Constraint.NUMBER_PRIMITIVE))
      .put("getUTCMonth", method(Constraint.NUMBER_PRIMITIVE))
      .put("getUTCSeconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("getYear", method(Constraint.NUMBER_PRIMITIVE))

      .put("setDate", method(Constraint.NUMBER_PRIMITIVE))
      .put("setFullYear", method(Constraint.NUMBER_PRIMITIVE))
      .put("setHours", method(Constraint.NUMBER_PRIMITIVE))
      .put("setMilliseconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("setMinutes", method(Constraint.NUMBER_PRIMITIVE))
      .put("setMonth", method(Constraint.NUMBER_PRIMITIVE))
      .put("setSeconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("setTime", method(Constraint.NUMBER_PRIMITIVE))
      .put("setUTCDate", method(Constraint.NUMBER_PRIMITIVE))
      .put("setUTCFullYear", method(Constraint.NUMBER_PRIMITIVE))
      .put("setUTCHours", method(Constraint.NUMBER_PRIMITIVE))
      .put("setUTCMilliseconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("setUTCMinutes", method(Constraint.NUMBER_PRIMITIVE))
      .put("setUTCMonth", method(Constraint.NUMBER_PRIMITIVE))
      .put("setUTCSeconds", method(Constraint.NUMBER_PRIMITIVE))
      .put("setYear", method(Constraint.NUMBER_PRIMITIVE))

      .put("toDateString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toISOString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toJSON", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toGMTString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toLocaleDateString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toLocaleTimeString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toTimeString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toUTCString", method(Constraint.TRUTHY_STRING_PRIMITIVE))

      // overrides Object
      .put("toString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toLocaleString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("valueOf", method(Constraint.NUMBER_PRIMITIVE))
      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.of();
  }


  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.of();
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("now", method(Constraint.NUMBER_PRIMITIVE))
      .put("parse", method(Constraint.NUMBER_PRIMITIVE))
      .put("UTC", method(Constraint.NUMBER_PRIMITIVE))
      .build();
  }
}
