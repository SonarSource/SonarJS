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

import static org.sonar.javascript.se.Constraint.BOOLEAN_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.NAN;

public class NumberBuiltInProperties extends BuiltInProperties {

  public static final NumberBuiltInProperties INSTANCE = new NumberBuiltInProperties();

  private NumberBuiltInProperties() {
  }

  @Override
  Map<String, SymbolicValue> getMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("toExponential", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toFixed", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toPrecision", method(Constraint.TRUTHY_STRING_PRIMITIVE))

      // overrides Object
      .put("toLocaleString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("toString", method(Constraint.TRUTHY_STRING_PRIMITIVE))
      .put("valueOf", method(Constraint.NUMBER_PRIMITIVE))

      .build();
  }

  @Override
  Map<String, Constraint> getPropertiesConstraints() {
    return ImmutableMap.of();
  }

  @Override
  Map<String, SymbolicValue> getOwnMethods() {
    return ImmutableMap.<String, SymbolicValue>builder()
      .put("isNaN", method(BOOLEAN_PRIMITIVE, BuiltInProperties.getIsSomethingArgumentsConstrainer(NAN)))
      .put("isFinite", method(Constraint.BOOLEAN_PRIMITIVE))
      .put("isInteger", method(Constraint.BOOLEAN_PRIMITIVE))
      .put("isSafeInteger", method(Constraint.BOOLEAN_PRIMITIVE))
      .put("parseFloat", method(Constraint.NUMBER_PRIMITIVE))
      .put("parseInt", method(Constraint.NUMBER_PRIMITIVE))
      .build();
  }

  @Override
  Map<String, Constraint> getOwnPropertiesConstraints() {
    return ImmutableMap.<String, Constraint>builder()
      .put("EPSILON", constraintOnRecentProperty(Constraint.TRUTHY_NUMBER_PRIMITIVE))
      .put("MAX_SAFE_INTEGER", constraintOnRecentProperty(Constraint.TRUTHY_NUMBER_PRIMITIVE))
      .put("MAX_VALUE", Constraint.TRUTHY_NUMBER_PRIMITIVE)
      .put("MIN_SAFE_INTEGER", constraintOnRecentProperty(Constraint.TRUTHY_NUMBER_PRIMITIVE))
      .put("MIN_VALUE", Constraint.TRUTHY_NUMBER_PRIMITIVE)
      .put("NaN", Constraint.NAN)
      .put("NEGATIVE_INFINITY", Constraint.TRUTHY_NUMBER_PRIMITIVE)
      .put("POSITIVE_INFINITY", Constraint.TRUTHY_NUMBER_PRIMITIVE)
      .build();
  }
}
