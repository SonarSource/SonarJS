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

public enum Type {
  NUMBER(Constraint.NUMBER),
  STRING(Constraint.STRING),
  BOOLEAN(Constraint.BOOLEAN),
  NULL(Constraint.NULL),
  UNDEFINED(Constraint.UNDEFINED),
  FUNCTION(Constraint.FUNCTION),
  ARRAY(Constraint.ARRAY),
  OTHER_OBJECT(Constraint.OTHER_OBJECT),
  OBJECT(Constraint.OBJECT);

  private Constraint constraint;

  Type(Constraint constraint) {
    this.constraint = constraint;
  }

  public Constraint constraint() {
    return constraint;
  }
}
