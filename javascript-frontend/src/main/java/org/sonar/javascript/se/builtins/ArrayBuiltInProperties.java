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

import static org.sonar.javascript.se.Constraint.ANY_VALUE;
import static org.sonar.javascript.se.Constraint.UNDEFINED;

public class ArrayBuiltInProperties extends BuiltInProperties {

  @Override
  Map<String, SymbolicValue> getMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("copyWithin", method(Constraint.ARRAY))
      .put("fill", method(Constraint.ARRAY))
      .put("push", method(Constraint.NUMBER))
      .put("reverse", method(Constraint.ARRAY))
      .put("sort", method(Constraint.ARRAY))
      .put("splice", method(Constraint.ARRAY))
      .put("unshift", method(Constraint.NUMBER))
      .put("concat", method(Constraint.ARRAY))
      .put("includes", method(Constraint.BOOLEAN))
      .put("join", method(Constraint.STRING))
      .put("slice", method(Constraint.ARRAY))
      .put("indexOf", method(Constraint.NUMBER))
      .put("lastIndexOf", method(Constraint.NUMBER))

      .put("forEach", method(UNDEFINED))
      .put("entries", method(Constraint.OTHER_OBJECT))
      .put("every", method(Constraint.BOOLEAN))
      .put("some", method(Constraint.BOOLEAN))
      .put("filter", method(Constraint.ARRAY))
      .put("findIndex", method(Constraint.NUMBER))
      .put("keys", method(Constraint.OTHER_OBJECT))
      .put("map", method(Constraint.ARRAY))
      .put("values", method(Constraint.OTHER_OBJECT))

      .put("pop", method(ANY_VALUE))
      .put("shift", method(ANY_VALUE))
      .put("find", method(ANY_VALUE))
      .put("reduce", method(ANY_VALUE))
      .put("reduceRight", method(ANY_VALUE))

      // overrides Object
      .put("toString", method(Constraint.STRING))
      .put("toLocaleString", method(Constraint.STRING))
      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.of(
      "length", Constraint.NUMBER
    );
  }

  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.of();
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("from", method(Constraint.ARRAY))
      .put("isArray", method(Constraint.BOOLEAN))
      .put("of", method(Constraint.ARRAY))
      .build();
  }
}
