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
package org.sonar.javascript.se.builtins;

import java.util.List;
import java.util.Map;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.sv.FunctionSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

public class BuiltInConstructorSymbolicValue extends BuiltInObjectSymbolicValue implements FunctionSymbolicValue {

  private final Constraint constraintOnReturnedValue;
  private final BuiltInObjectSymbolicValue prototypeOfInstances;

  private BuiltInConstructorSymbolicValue(Map<String, BuiltInProperty> properties, Constraint constraintOnReturnedValue, BuiltInObjectSymbolicValue prototypeOfInstances) {
    super(properties, BuiltInObjectSymbolicValue.FUNCTION_PROTOTYPE, Constraint.FUNCTION);
    this.constraintOnReturnedValue = constraintOnReturnedValue;
    this.prototypeOfInstances = prototypeOfInstances;
  }

  public static BuiltInConstructorSymbolicValue constructor(Map<String, BuiltInProperty> properties, Constraint constraintOnReturnedValue,
    BuiltInObjectSymbolicValue prototypeOfInstances) {
    return new BuiltInConstructorSymbolicValue(properties, constraintOnReturnedValue, prototypeOfInstances);
  }

  @Override
  public SymbolicValue instantiate() {
    return new SymbolicValueWithConstraint(prototypeOfInstances.baseConstraint());
  }

  @Override
  public SymbolicValue call(List<SymbolicValue> argumentValues) {
    return new SymbolicValueWithConstraint(constraintOnReturnedValue);
  }

  public BuiltInObjectSymbolicValue getPrototypeOfInstances() {
    return prototypeOfInstances;
  }

  @Override
  public SymbolicValue getPropertyValue(String propertyName) {
    if ("prototype".equals(propertyName)) {
      return prototypeOfInstances;
    }
    return super.getPropertyValue(propertyName);
  }

}
