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
import org.sonar.javascript.se.Constraint;

import static org.sonar.javascript.se.builtins.BuiltInProperty.EMPTY;
import static org.sonar.javascript.se.builtins.BuiltInProperty.NUMBER_NUMBER;
import static org.sonar.javascript.se.builtins.BuiltInProperty.ONE_NUMBER;
import static org.sonar.javascript.se.builtins.BuiltInProperty.ONE_STRING;
import static org.sonar.javascript.se.builtins.BuiltInProperty.TO_LOCALE_STRING_SIGNATURE;
import static org.sonar.javascript.se.builtins.BuiltInProperty.method;

public class DateBuiltInProperties {

  private static final List<Constraint> threeNumbers = ImmutableList.of(Constraint.ANY_NUMBER, Constraint.ANY_NUMBER, Constraint.ANY_NUMBER);
  private static final List<Constraint> fourNumbers = ImmutableList.of(Constraint.ANY_NUMBER, Constraint.ANY_NUMBER, Constraint.ANY_NUMBER, Constraint.ANY_NUMBER);

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
      .put("getDate", method(Constraint.TRUTHY_NUMBER_PRIMITIVE, EMPTY))
      .put("getDay", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getFullYear", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getHours", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getMilliseconds", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getMinutes", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getMonth", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getSeconds", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getTime", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getTimezoneOffset", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCDate", method(Constraint.TRUTHY_NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCDay", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCFullYear", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCHours", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCMilliseconds", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCMinutes", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCMonth", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getUTCSeconds", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .put("getYear", method(Constraint.NUMBER_PRIMITIVE, EMPTY))

    .put("setDate", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER, true))
      .put("setFullYear", method(Constraint.NUMBER_PRIMITIVE, threeNumbers, true))
      .put("setHours", method(Constraint.NUMBER_PRIMITIVE, fourNumbers, true))
    .put("setMilliseconds", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER, true))
      .put("setMinutes", method(Constraint.NUMBER_PRIMITIVE, threeNumbers, true))
    .put("setMonth", method(Constraint.NUMBER_PRIMITIVE, NUMBER_NUMBER, true))
    .put("setSeconds", method(Constraint.NUMBER_PRIMITIVE, NUMBER_NUMBER, true))
    .put("setTime", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER, true))
    .put("setUTCDate", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER, true))
      .put("setUTCFullYear", method(Constraint.NUMBER_PRIMITIVE, threeNumbers, true))
      .put("setUTCHours", method(Constraint.NUMBER_PRIMITIVE, fourNumbers, true))
    .put("setUTCMilliseconds", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER, true))
      .put("setUTCMinutes", method(Constraint.NUMBER_PRIMITIVE, threeNumbers, true))
    .put("setUTCMonth", method(Constraint.NUMBER_PRIMITIVE, NUMBER_NUMBER, true))
    .put("setUTCSeconds", method(Constraint.NUMBER_PRIMITIVE, NUMBER_NUMBER, true))
    .put("setYear", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER, true))

      .put("toDateString", method(Constraint.TRUTHY_STRING_PRIMITIVE, EMPTY))
      .put("toISOString", method(Constraint.TRUTHY_STRING_PRIMITIVE, EMPTY))
      .put("toJSON", method(Constraint.TRUTHY_STRING_PRIMITIVE, EMPTY))
      .put("toGMTString", method(Constraint.TRUTHY_STRING_PRIMITIVE, EMPTY))
      .put("toLocaleDateString", method(Constraint.TRUTHY_STRING_PRIMITIVE, TO_LOCALE_STRING_SIGNATURE))
      .put("toLocaleTimeString", method(Constraint.TRUTHY_STRING_PRIMITIVE, TO_LOCALE_STRING_SIGNATURE))
      .put("toTimeString", method(Constraint.TRUTHY_STRING_PRIMITIVE, EMPTY))
      .put("toUTCString", method(Constraint.TRUTHY_STRING_PRIMITIVE, EMPTY))

      // overrides Object
      .put("toString", method(Constraint.TRUTHY_STRING_PRIMITIVE, EMPTY))
      .put("toLocaleString", method(Constraint.TRUTHY_STRING_PRIMITIVE, TO_LOCALE_STRING_SIGNATURE))
      .put("valueOf", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
      .build();

  public static final Map<String, BuiltInProperty> PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("now", method(Constraint.NUMBER_PRIMITIVE, EMPTY))
    .put("parse", method(Constraint.NUMBER_PRIMITIVE, ONE_STRING))
    .put("UTC", method(Constraint.NUMBER_PRIMITIVE, (int index) -> {
      if (index < 7) {
        return Constraint.ANY_NUMBER;
      }
      return null;
    }))
    .build();

  private DateBuiltInProperties() {
  }

}
