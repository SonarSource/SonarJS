/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.se;

import com.google.common.collect.Lists;
import java.util.Arrays;
import java.util.List;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.javascript.se.builtins.BuiltInObjectSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;

public enum Type {
  OBJECT(Constraint.OBJECT, BuiltInObjectSymbolicValue.OBJECT_PROTOTYPE),
  NUMBER_PRIMITIVE(Constraint.NUMBER_PRIMITIVE, BuiltInObjectSymbolicValue.NUMBER_PROTOTYPE),
  NUMBER_OBJECT(Constraint.NUMBER_OBJECT, BuiltInObjectSymbolicValue.NUMBER_PROTOTYPE),
  STRING_PRIMITIVE(Constraint.STRING_PRIMITIVE, BuiltInObjectSymbolicValue.STRING_PROTOTYPE),
  STRING_OBJECT(Constraint.STRING_OBJECT, BuiltInObjectSymbolicValue.STRING_PROTOTYPE),
  BOOLEAN_PRIMITIVE(Constraint.BOOLEAN_PRIMITIVE, BuiltInObjectSymbolicValue.BOOLEAN_PROTOTYPE),
  BOOLEAN_OBJECT(Constraint.BOOLEAN_OBJECT, BuiltInObjectSymbolicValue.BOOLEAN_PROTOTYPE),
  FUNCTION(Constraint.FUNCTION, BuiltInObjectSymbolicValue.FUNCTION_PROTOTYPE),
  ARRAY(Constraint.ARRAY, BuiltInObjectSymbolicValue.ARRAY_PROTOTYPE),
  DATE(Constraint.DATE, BuiltInObjectSymbolicValue.DATE_PROTOTYPE),
  REGEXP(Constraint.REGEXP, BuiltInObjectSymbolicValue.REGEXP_PROTOTYPE),
  NULL(Constraint.NULL, null),
  UNDEFINED(Constraint.UNDEFINED, null),
  ;

  private static final List<Type> VALUES_REVERSED = Lists.reverse(Arrays.asList(Type.values()));

  private final Constraint constraint;
  private final BuiltInObjectSymbolicValue prototype;

  Type(Constraint constraint, @Nullable BuiltInObjectSymbolicValue prototype) {
    this.constraint = constraint;
    this.prototype = prototype;
  }

  public Constraint constraint() {
    return constraint;
  }

  public SymbolicValue getPropertyValue(String propertyName) {
    if (prototype == null) {
      throw new IllegalStateException("Cannot access a property on a " + this);
    }
    return prototype.getPropertyValue(propertyName);
  }

  @CheckForNull
  public BuiltInObjectSymbolicValue prototype() {
    return prototype;
  }

  public static Type find(Constraint constraint) {
    for (Type type : VALUES_REVERSED) {
      if (constraint.isStricterOrEqualTo(type.constraint())) {
        return type;
      }
    }

    return null;
  }
}
