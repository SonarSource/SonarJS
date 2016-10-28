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
      .put("getDate", method(Constraint.TRUTHY_NUMBER))
      .put("getDay", method(Constraint.NUMBER))
      .put("getFullYear", method(Constraint.NUMBER))
      .put("getHours", method(Constraint.NUMBER))
      .put("getMilliseconds", method(Constraint.NUMBER))
      .put("getMinutes", method(Constraint.NUMBER))
      .put("getMonth", method(Constraint.NUMBER))
      .put("getSeconds", method(Constraint.NUMBER))
      .put("getTime", method(Constraint.NUMBER))
      .put("getTimezoneOffset", method(Constraint.NUMBER))
      .put("getUTCDate", method(Constraint.TRUTHY_NUMBER))
      .put("getUTCDay", method(Constraint.NUMBER))
      .put("getUTCFullYear", method(Constraint.NUMBER))
      .put("getUTCHours", method(Constraint.NUMBER))
      .put("getUTCMilliseconds", method(Constraint.NUMBER))
      .put("getUTCMinutes", method(Constraint.NUMBER))
      .put("getUTCMonth", method(Constraint.NUMBER))
      .put("getUTCSeconds", method(Constraint.NUMBER))
      .put("getYear", method(Constraint.NUMBER))

      .put("setDate", method(Constraint.NUMBER))
      .put("setFullYear", method(Constraint.NUMBER))
      .put("setHours", method(Constraint.NUMBER))
      .put("setMilliseconds", method(Constraint.NUMBER))
      .put("setMinutes", method(Constraint.NUMBER))
      .put("setMonth", method(Constraint.NUMBER))
      .put("setSeconds", method(Constraint.NUMBER))
      .put("setTime", method(Constraint.NUMBER))
      .put("setUTCDate", method(Constraint.NUMBER))
      .put("setUTCFullYear", method(Constraint.NUMBER))
      .put("setUTCHours", method(Constraint.NUMBER))
      .put("setUTCMilliseconds", method(Constraint.NUMBER))
      .put("setUTCMinutes", method(Constraint.NUMBER))
      .put("setUTCMonth", method(Constraint.NUMBER))
      .put("setUTCSeconds", method(Constraint.NUMBER))
      .put("setYear", method(Constraint.NUMBER))

      .put("toDateString", method(Constraint.STRING))
      .put("toISOString", method(Constraint.STRING))
      .put("toJSON", method(Constraint.STRING))
      .put("toGMTString", method(Constraint.STRING))
      .put("toLocaleDateString", method(Constraint.STRING))
      .put("toLocaleTimeString", method(Constraint.STRING))
      .put("toTimeString", method(Constraint.STRING))
      .put("toUTCString", method(Constraint.STRING))

      // overrides Object
      .put("toString", method(Constraint.STRING))
      .put("toLocaleString", method(Constraint.STRING))
      .put("valueOf", method(Constraint.NUMBER))
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
      .put("now", method(Constraint.NUMBER))
      .put("parse", method(Constraint.NUMBER))
      .put("UTC", method(Constraint.NUMBER))
      .build();
  }
}
