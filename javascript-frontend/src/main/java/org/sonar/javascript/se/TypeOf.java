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
package org.sonar.javascript.se;

import com.google.common.collect.ImmutableMap;
import java.util.Map;
import javax.annotation.CheckForNull;

import static org.sonar.javascript.se.Constraint.NULL;
import static org.sonar.javascript.se.Constraint.UNDEFINED;

class TypeOf {

  static final Map<String, Nullability> typeOfEqualNullability = ImmutableMap.<String, Nullability>builder()
    .put("undefined", Nullability.UNDEFINED)
    .put("function", Nullability.NOT_NULLY)
    .put("object", Nullability.NOT_UNDEFINED)
    .put("number", Nullability.NOT_NULLY)
    .put("string", Nullability.NOT_NULLY)
    .put("boolean", Nullability.NOT_NULLY)
    .put("symbol", Nullability.NOT_NULLY)
    .build();

  static final Map<String, Nullability> typeOfNotEqualNullability = ImmutableMap.<String, Nullability>builder()
    .put("undefined", Nullability.NOT_UNDEFINED)
    .put("object", Nullability.NOT_NULL)
    .build();

  private TypeOf() {
  }

  @CheckForNull
  static String typeOf(Constraint constraint) {
    if (constraint.equals(NULL)) {
      return "object";
    } else if (constraint.equals(UNDEFINED)) {
      return "undefined";

    } else {
      return null;
    }
  }

  static boolean isValidType(String type) {
    return typeOfEqualNullability.containsKey(type);
  }
}
