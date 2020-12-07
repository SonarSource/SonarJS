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
import java.util.Map;
import java.util.function.IntFunction;
import org.sonar.javascript.se.Constraint;

import static org.sonar.javascript.se.builtins.BuiltInProperty.EMPTY;
import static org.sonar.javascript.se.builtins.BuiltInProperty.NUMBER_NUMBER;
import static org.sonar.javascript.se.builtins.BuiltInProperty.NUMBER_STRING;
import static org.sonar.javascript.se.builtins.BuiltInProperty.ONE_NUMBER;
import static org.sonar.javascript.se.builtins.BuiltInProperty.ONE_STRING;
import static org.sonar.javascript.se.builtins.BuiltInProperty.STRING_NUMBER;
import static org.sonar.javascript.se.builtins.BuiltInProperty.method;
import static org.sonar.javascript.se.builtins.BuiltInProperty.property;

public class StringBuiltInProperties {

  private static final IntFunction<Constraint> localeCompareSignature = (int parameterIndex) -> {
    switch (parameterIndex) {
      case 0:
        return Constraint.ANY_STRING;
      case 1:
        return Constraint.ANY_STRING.or(Constraint.ARRAY);
      case 2:
        return Constraint.OBJECT;
      default:
        return null;
    }
  };

  private static final IntFunction<Constraint> replaceSignature = (int parameterIndex) -> {
    switch (parameterIndex) {
      case 0:
        return Constraint.ANY_STRING.or(Constraint.REGEXP);
      case 1:
        return Constraint.ANY_STRING.or(Constraint.FUNCTION);
      default:
        return null;
    }
  };

  private static final IntFunction<Constraint> numbersSignature = (int parameterIndex) -> Constraint.ANY_NUMBER;

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("charAt", method(Constraint.STRING_PRIMITIVE, ONE_NUMBER))
    .put("charCodeAt", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
    .put("codePointAt", method(Constraint.NUMBER_PRIMITIVE, ONE_NUMBER))
    .put("concat", method(Constraint.STRING_PRIMITIVE, (int parameterIndex) -> Constraint.ANY_STRING))
    .put("includes", method(Constraint.BOOLEAN_PRIMITIVE, STRING_NUMBER))
    .put("endsWith", method(Constraint.BOOLEAN_PRIMITIVE, STRING_NUMBER))
    .put("indexOf", method(Constraint.NUMBER_PRIMITIVE, STRING_NUMBER))
    .put("lastIndexOf", method(Constraint.NUMBER_PRIMITIVE, STRING_NUMBER))
    .put("localeCompare", method(Constraint.NUMBER_PRIMITIVE, localeCompareSignature))
    .put("match", method(Constraint.ARRAY.or(Constraint.NULL), ImmutableList.of(Constraint.REGEXP)))
    .put("normalize", method(Constraint.STRING_PRIMITIVE, ONE_STRING))
    .put("padEnd", method(Constraint.STRING_PRIMITIVE, NUMBER_STRING))
    .put("padStart", method(Constraint.STRING_PRIMITIVE, NUMBER_STRING))
    .put("repeat", method(Constraint.STRING_PRIMITIVE, ONE_NUMBER))
    .put("replace", method(Constraint.STRING_PRIMITIVE, replaceSignature))
    .put("search", method(Constraint.NUMBER_PRIMITIVE, ImmutableList.of(Constraint.REGEXP)))
    .put("slice", method(Constraint.STRING_PRIMITIVE, NUMBER_NUMBER))
    .put("split", method(Constraint.ARRAY, ImmutableList.of(Constraint.ANY_STRING.or(Constraint.REGEXP), Constraint.ANY_NUMBER)))
    .put("startsWith", method(Constraint.BOOLEAN_PRIMITIVE, STRING_NUMBER))
    .put("substr", method(Constraint.STRING_PRIMITIVE, NUMBER_NUMBER))
    .put("substring", method(Constraint.STRING_PRIMITIVE, NUMBER_NUMBER))
    .put("toLocaleLowerCase", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("toLocaleUpperCase", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("toLowerCase", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("toUpperCase", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("trim", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("length", property(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO)))

    // overrides Object
    .put("toString", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("valueOf", method(Constraint.STRING_PRIMITIVE, EMPTY))

    // HTML wrapper methods
    .put("anchor", method(Constraint.STRING_PRIMITIVE, ONE_STRING))
    .put("big", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("blink", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("bold", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("fixed", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("fontcolor", method(Constraint.STRING_PRIMITIVE, ONE_STRING))
    .put("fontsize", method(Constraint.STRING_PRIMITIVE, ONE_NUMBER))
    .put("italics", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("link", method(Constraint.STRING_PRIMITIVE, ONE_STRING))
    .put("small", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("strike", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("sub", method(Constraint.STRING_PRIMITIVE, EMPTY))
    .put("sup", method(Constraint.STRING_PRIMITIVE, EMPTY))

    // Provided by Ember framework, not part of ES specification
    .put("camelize", method(Constraint.STRING_PRIMITIVE))
    .put("capitalize", method(Constraint.STRING_PRIMITIVE))
    .put("classify", method(Constraint.STRING_PRIMITIVE))
    .put("dasherize", method(Constraint.STRING_PRIMITIVE))
    .put("decamelize", method(Constraint.STRING_PRIMITIVE))
    .put("fmt", method(Constraint.STRING_PRIMITIVE))
    .put("loc", method(Constraint.STRING_PRIMITIVE))
    .put("underscore", method(Constraint.STRING_PRIMITIVE))
    .put("w", method(Constraint.ARRAY))
    .put("quote", method(Constraint.STRING_PRIMITIVE))

    .build();

  public static final Map<String, BuiltInProperty> PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("fromCharCode", method(Constraint.STRING_PRIMITIVE, numbersSignature))
    .put("fromCodePoint", method(Constraint.STRING_PRIMITIVE, numbersSignature))
    .put("raw", method(Constraint.STRING_PRIMITIVE))

    .build();

  private StringBuiltInProperties() {
  }

}
