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

import org.sonar.javascript.se.builtins.ArrayBuiltInProperties;
import org.sonar.javascript.se.builtins.BooleanBuiltInProperties;
import org.sonar.javascript.se.builtins.BuiltInProperties;
import org.sonar.javascript.se.builtins.DateBuiltInProperties;
import org.sonar.javascript.se.builtins.FunctionBuiltInProperties;
import org.sonar.javascript.se.builtins.NullOrUndefinedBuiltInProperties;
import org.sonar.javascript.se.builtins.NumberBuiltInProperties;
import org.sonar.javascript.se.builtins.ObjectBuiltInProperties;
import org.sonar.javascript.se.builtins.StringBuiltInProperties;

public enum Type {
  NUMBER(Constraint.NUMBER, new NumberBuiltInProperties()),
  STRING(Constraint.STRING, new StringBuiltInProperties()),
  BOOLEAN(Constraint.BOOLEAN, new BooleanBuiltInProperties()),
  NULL(Constraint.NULL, new NullOrUndefinedBuiltInProperties()),
  UNDEFINED(Constraint.UNDEFINED, new NullOrUndefinedBuiltInProperties()),
  FUNCTION(Constraint.FUNCTION, new FunctionBuiltInProperties()),
  ARRAY(Constraint.ARRAY, new ArrayBuiltInProperties()),
  DATE(Constraint.DATE, new DateBuiltInProperties()),
  OBJECT(Constraint.OBJECT, new ObjectBuiltInProperties());

  private Constraint constraint;
  private BuiltInProperties builtInProperties;

  Type(Constraint constraint, BuiltInProperties builtInProperties) {
    this.constraint = constraint;
    this.builtInProperties = builtInProperties;
  }

  public BuiltInProperties builtInProperties() {
    return builtInProperties;
  }

  public Constraint constraint() {
    return constraint;
  }
}
