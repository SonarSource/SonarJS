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

  @Override
  Map<String, SymbolicValue> getMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("charAt", method(Constraint.STRING))
      .put("charCodeAt", method(Constraint.NUMBER))
      .put("codePointAt", method(Constraint.NUMBER))
      .put("concat", method(Constraint.STRING))
      .put("includes", method(Constraint.BOOLEAN))
      .put("endsWith", method(Constraint.BOOLEAN))
      .put("indexOf", method(Constraint.NUMBER))
      .put("lastIndexOf", method(Constraint.NUMBER))
      .put("localeCompare", method(Constraint.NUMBER))
      .put("match", method(Constraint.ARRAY.or(Constraint.NULL)))
      .put("normalize", method(Constraint.STRING))
      .put("padEnd", method(Constraint.STRING))
      .put("padStart", method(Constraint.STRING))
      .put("repeat", method(Constraint.STRING))
      .put("replace", method(Constraint.STRING))
      .put("search", method(Constraint.NUMBER))
      .put("slice", method(Constraint.STRING))
      .put("split", method(Constraint.ARRAY))
      .put("startsWith", method(Constraint.BOOLEAN))
      .put("substr", method(Constraint.STRING))
      .put("substring", method(Constraint.STRING))
      .put("toLocaleLowerCase", method(Constraint.STRING))
      .put("toLocaleUpperCase", method(Constraint.STRING))
      .put("toLowerCase", method(Constraint.STRING))
      .put("toUpperCase", method(Constraint.STRING))
      .put("trim", method(Constraint.STRING))

      // overrides Object
      .put("toString", method(Constraint.STRING))
      .put("valueOf", method(Constraint.STRING))

      // HTML wrapper methods
      .put("anchor", method(Constraint.STRING))
      .put("big", method(Constraint.STRING))
      .put("blink", method(Constraint.STRING))
      .put("bold", method(Constraint.STRING))
      .put("fixed", method(Constraint.STRING))
      .put("fontcolor", method(Constraint.STRING))
      .put("fontsize", method(Constraint.STRING))
      .put("italics", method(Constraint.STRING))
      .put("small", method(Constraint.STRING))
      .put("strike", method(Constraint.STRING))
      .put("sub", method(Constraint.STRING))
      .put("sup", method(Constraint.STRING))
      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.of(
      "length", Constraint.NUMBER
    );
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("fromCharCode", method(Constraint.STRING))
      .build();
  }

  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.of();
  }
}
