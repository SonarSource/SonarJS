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
import java.util.HashMap;
import java.util.Map;
import org.sonar.javascript.se.Constraint;

import static org.sonar.javascript.se.builtins.BuiltInProperty.constraintOnRecentProperty;
import static org.sonar.javascript.se.builtins.BuiltInProperty.method;
import static org.sonar.javascript.se.builtins.BuiltInProperty.property;

public class RegexpBuiltInProperties {

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("compile", method(Constraint.UNDEFINED, ImmutableList.of(Constraint.ANY_STRING, Constraint.ANY_STRING), true))
    .put("exec", method(Constraint.ARRAY.or(Constraint.NULL), BuiltInProperty.ONE_STRING, true))
    .put("test", method(Constraint.BOOLEAN_PRIMITIVE, BuiltInProperty.ONE_STRING))

    // overrides Object
    .put("toString", method(Constraint.STRING_PRIMITIVE, BuiltInProperty.EMPTY))

    .put("lastIndex", property(Constraint.NUMBER_PRIMITIVE))
    .put("flags", property(constraintOnRecentProperty(Constraint.STRING_PRIMITIVE)))
    .put("global", property(Constraint.BOOLEAN_PRIMITIVE))
    .put("ignoreCase", property(Constraint.BOOLEAN_PRIMITIVE))
    .put("multiline", property(Constraint.BOOLEAN_PRIMITIVE))
    .put("source", property(Constraint.STRING_PRIMITIVE))
    .put("sticky", property(constraintOnRecentProperty(Constraint.BOOLEAN_PRIMITIVE)))
    .put("unicode", property(constraintOnRecentProperty(Constraint.BOOLEAN_PRIMITIVE)))
    .build();

  public static final Map<String, BuiltInProperty> PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("input", property(Constraint.STRING_PRIMITIVE))
    .put("lastMatch", property(Constraint.STRING_PRIMITIVE))
    .put("lastParen", property(Constraint.STRING_PRIMITIVE))
    .put("leftContext", property(Constraint.STRING_PRIMITIVE))
    .put("rightContext", property(Constraint.STRING_PRIMITIVE))
    .put("$_", property(Constraint.STRING_PRIMITIVE))
    .put("$&", property(Constraint.STRING_PRIMITIVE))
    .put("$+", property(Constraint.STRING_PRIMITIVE))
    .put("$`", property(Constraint.STRING_PRIMITIVE))
    .put("$'", property(Constraint.STRING_PRIMITIVE))
    .putAll(dollarProperties())
    .build();

  private RegexpBuiltInProperties() {
  }

  private static Map<String, BuiltInProperty> dollarProperties() {
    Map<String, BuiltInProperty> properties = new HashMap<>();
    BuiltInProperty property = property(Constraint.STRING_PRIMITIVE);
    for (int i = 1; i <= 9; i++) {
      properties.put("$" + i, property);
    }
    return properties;
  }

}
