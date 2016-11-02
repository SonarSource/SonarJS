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

public class StringBuiltInProperties extends BuiltInProperties {

  public static final StringBuiltInProperties INSTANCE = new StringBuiltInProperties();

  private StringBuiltInProperties() {
  }

  @Override
  Map<String, SymbolicValue> getMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("charAt", method(Constraint.STRING_PRIMITIVE))
      .put("charCodeAt", method(Constraint.NUMBER_PRIMITIVE))
      .put("codePointAt", method(Constraint.NUMBER_PRIMITIVE))
      .put("concat", method(Constraint.STRING_PRIMITIVE))
      .put("includes", method(Constraint.BOOLEAN_PRIMITIVE))
      .put("endsWith", method(Constraint.BOOLEAN_PRIMITIVE))
      .put("indexOf", method(Constraint.NUMBER_PRIMITIVE))
      .put("lastIndexOf", method(Constraint.NUMBER_PRIMITIVE))
      .put("localeCompare", method(Constraint.NUMBER_PRIMITIVE))
      .put("match", method(Constraint.ARRAY.or(Constraint.NULL)))
      .put("normalize", method(Constraint.STRING_PRIMITIVE))
      .put("padEnd", method(Constraint.STRING_PRIMITIVE))
      .put("padStart", method(Constraint.STRING_PRIMITIVE))
      .put("repeat", method(Constraint.STRING_PRIMITIVE))
      .put("replace", method(Constraint.STRING_PRIMITIVE))
      .put("search", method(Constraint.NUMBER_PRIMITIVE))
      .put("slice", method(Constraint.STRING_PRIMITIVE))
      .put("split", method(Constraint.ARRAY))
      .put("startsWith", method(Constraint.BOOLEAN_PRIMITIVE))
      .put("substr", method(Constraint.STRING_PRIMITIVE))
      .put("substring", method(Constraint.STRING_PRIMITIVE))
      .put("toLocaleLowerCase", method(Constraint.STRING_PRIMITIVE))
      .put("toLocaleUpperCase", method(Constraint.STRING_PRIMITIVE))
      .put("toLowerCase", method(Constraint.STRING_PRIMITIVE))
      .put("toUpperCase", method(Constraint.STRING_PRIMITIVE))
      .put("trim", method(Constraint.STRING_PRIMITIVE))

      // overrides Object
      .put("toString", method(Constraint.STRING_PRIMITIVE))
      .put("valueOf", method(Constraint.STRING_PRIMITIVE))

      // HTML wrapper methods
      .put("anchor", method(Constraint.STRING_PRIMITIVE))
      .put("big", method(Constraint.STRING_PRIMITIVE))
      .put("blink", method(Constraint.STRING_PRIMITIVE))
      .put("bold", method(Constraint.STRING_PRIMITIVE))
      .put("fixed", method(Constraint.STRING_PRIMITIVE))
      .put("fontcolor", method(Constraint.STRING_PRIMITIVE))
      .put("fontsize", method(Constraint.STRING_PRIMITIVE))
      .put("italics", method(Constraint.STRING_PRIMITIVE))
      .put("small", method(Constraint.STRING_PRIMITIVE))
      .put("strike", method(Constraint.STRING_PRIMITIVE))
      .put("sub", method(Constraint.STRING_PRIMITIVE))
      .put("sup", method(Constraint.STRING_PRIMITIVE))
      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.of(
      "length", Constraint.NUMBER_PRIMITIVE
    );
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("fromCharCode", method(Constraint.STRING_PRIMITIVE))
      .put("fromCodePoint", method(Constraint.STRING_PRIMITIVE))
      .put("raw", method(Constraint.STRING_PRIMITIVE))
      .build();
  }

  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.of();
  }
}
