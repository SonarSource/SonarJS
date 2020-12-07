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

import com.google.common.collect.ImmutableMap;
import java.util.Map;
import org.sonar.javascript.se.Constraint;

import static org.sonar.javascript.se.builtins.BuiltInProperty.method;
import static org.sonar.javascript.se.builtins.BuiltInProperty.property;

public class BooleanBuiltInProperties {

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES =
    ImmutableMap.<String, BuiltInProperty>builder()
      // overrides Object
      .put("toString", method(Constraint.TRUTHY_STRING_PRIMITIVE, BuiltInProperty.EMPTY))
      .put("valueOf", method(Constraint.BOOLEAN_PRIMITIVE, BuiltInProperty.EMPTY))

      .build();

  public static final Map<String, BuiltInProperty> PROPERTIES = ImmutableMap.of();

  private BooleanBuiltInProperties() {
  }

}
