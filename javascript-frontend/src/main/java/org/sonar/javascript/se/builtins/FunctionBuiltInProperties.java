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

import static org.sonar.javascript.se.builtins.BuiltInProperty.method;
import static org.sonar.javascript.se.builtins.BuiltInProperty.property;

public class FunctionBuiltInProperties {

  private static final IntFunction<Constraint> anyValues = (int index) -> Constraint.ANY_VALUE;

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("apply", method(Constraint.ANY_VALUE, ImmutableList.of(Constraint.ANY_VALUE, Constraint.ANY_VALUE), true))
    .put("bind", method(Constraint.FUNCTION, anyValues))
    .put("call", method(Constraint.ANY_VALUE, anyValues, true))
    // overrides Object
    .put("toString", method(Constraint.STRING_PRIMITIVE, BuiltInProperty.EMPTY))
    .put("length", property(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO)))
    .put("name", property(Constraint.STRING_PRIMITIVE))
    .build();

  public static final Map<String, BuiltInProperty> PROPERTIES = ImmutableMap.of();

  private FunctionBuiltInProperties() {
  }

}
