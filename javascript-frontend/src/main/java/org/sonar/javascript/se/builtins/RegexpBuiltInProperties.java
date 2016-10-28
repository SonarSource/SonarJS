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

public class RegexpBuiltInProperties extends BuiltInProperties {

  @Override
  Map<String, SymbolicValue> getMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("compile", method(Constraint.UNDEFINED))
      .put("exec", method(Constraint.ARRAY.or(Constraint.NULL)))
      .put("test", method(Constraint.BOOLEAN))

      // overrides Object
      .put("toString", method(Constraint.STRING))
      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.<String, Constraint>builder()
      .put("lastIndex", Constraint.NUMBER)
      .put("flags", Constraint.STRING)
      .put("global", Constraint.BOOLEAN)
      .put("ignoreCase", Constraint.BOOLEAN)
      .put("multiline", Constraint.BOOLEAN)
      .put("source", Constraint.STRING)
      .put("sticky", Constraint.BOOLEAN)
      .put("unicode", Constraint.BOOLEAN)
      .build();
  }

  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.of();
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.of();
  }
}
