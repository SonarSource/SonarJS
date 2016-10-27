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

import com.google.common.collect.Lists;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import javax.annotation.Nullable;
import org.sonar.javascript.se.builtins.ArrayBuiltInProperties;
import org.sonar.javascript.se.builtins.BooleanBuiltInProperties;
import org.sonar.javascript.se.builtins.BuiltInProperties;
import org.sonar.javascript.se.builtins.DateBuiltInProperties;
import org.sonar.javascript.se.builtins.FunctionBuiltInProperties;
import org.sonar.javascript.se.builtins.NullOrUndefinedBuiltInProperties;
import org.sonar.javascript.se.builtins.NumberBuiltInProperties;
import org.sonar.javascript.se.builtins.ObjectBuiltInProperties;
import org.sonar.javascript.se.builtins.RegexpBuiltInProperties;
import org.sonar.javascript.se.builtins.StringBuiltInProperties;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;

public enum Type {
  OBJECT(Constraint.OBJECT, null, new ObjectBuiltInProperties()),
  NUMBER(Constraint.NUMBER, OBJECT, new NumberBuiltInProperties()),
  STRING(Constraint.STRING, OBJECT, new StringBuiltInProperties()),
  BOOLEAN(Constraint.BOOLEAN, OBJECT, new BooleanBuiltInProperties()),
  FUNCTION(Constraint.FUNCTION, OBJECT, new FunctionBuiltInProperties()),
  ARRAY(Constraint.ARRAY, OBJECT, new ArrayBuiltInProperties()),
  DATE(Constraint.DATE, OBJECT, new DateBuiltInProperties()),
  REGEXP(Constraint.REGEXP, OBJECT, new RegexpBuiltInProperties()),
  NULL(Constraint.NULL, null, new NullOrUndefinedBuiltInProperties()),
  UNDEFINED(Constraint.UNDEFINED, null, new NullOrUndefinedBuiltInProperties()),
  ;

  private static final List<Type> VALUES_REVERSED = Lists.reverse(Arrays.asList(Type.values()));

  private Constraint constraint;
  private BuiltInProperties builtInProperties;
  private Type parentType;

  Type(Constraint constraint, @Nullable Type parentType, BuiltInProperties builtInProperties) {
    this.constraint = constraint;
    this.builtInProperties = builtInProperties;
    this.parentType = parentType;
  }

  public Constraint constraint() {
    return constraint;
  }

  public Type parentType() {
    return parentType;
  }

  private SymbolicValue getValueFromPrototype(String propertyName) {
    if (parentType != null) {
      return parentType.getValueForProperty(propertyName);
    }

    return UnknownSymbolicValue.UNKNOWN;
  }

  public SymbolicValue getValueForProperty(String propertyName) {
    SymbolicValue valueForProperty = builtInProperties.getValueForProperty(propertyName);
    if (valueForProperty == null) {
      return getValueFromPrototype(propertyName);
    }

    return valueForProperty;
  }

  public Optional<SymbolicValue> getValueForOwnProperty(String name) {
    return builtInProperties.getValueForOwnProperty(name);
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
