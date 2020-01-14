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
import org.sonar.javascript.se.Constraint;

import static org.sonar.javascript.se.Constraint.ANY_VALUE;
import static org.sonar.javascript.se.Constraint.BOOLEAN_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.NAN;
import static org.sonar.javascript.se.builtins.BuiltInProperty.EMPTY;
import static org.sonar.javascript.se.builtins.BuiltInProperty.ONE_NUMBER;
import static org.sonar.javascript.se.builtins.BuiltInProperty.ONE_STRING;
import static org.sonar.javascript.se.builtins.BuiltInProperty.STRING_NUMBER;
import static org.sonar.javascript.se.builtins.BuiltInProperty.TO_LOCALE_STRING_SIGNATURE;
import static org.sonar.javascript.se.builtins.BuiltInProperty.constraintOnRecentProperty;
import static org.sonar.javascript.se.builtins.BuiltInProperty.method;
import static org.sonar.javascript.se.builtins.BuiltInProperty.property;

public class NumberBuiltInProperties {

  private static final ImmutableList<Constraint> anyValue = ImmutableList.of(ANY_VALUE);

  public static final Map<String, BuiltInProperty> PROTOTYPE_PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("toExponential", method(Constraint.TRUTHY_STRING_PRIMITIVE, ONE_NUMBER))
    .put("toFixed", method(Constraint.TRUTHY_STRING_PRIMITIVE, ONE_NUMBER))
    .put("toPrecision", method(Constraint.TRUTHY_STRING_PRIMITIVE, ONE_NUMBER))

    // overrides Object
    .put("toLocaleString", method(Constraint.TRUTHY_STRING_PRIMITIVE, TO_LOCALE_STRING_SIGNATURE))
    .put("toString", method(Constraint.TRUTHY_STRING_PRIMITIVE, ONE_NUMBER))
    .put("valueOf", method(Constraint.NUMBER_PRIMITIVE, EMPTY))

    .build();

  public static final Map<String, BuiltInProperty> PROPERTIES = ImmutableMap.<String, BuiltInProperty>builder()
    .put("isNaN", method(BOOLEAN_PRIMITIVE, BuiltInProperty.getIsSomethingArgumentsConstrainer(NAN), anyValue))
    .put("isFinite", method(Constraint.BOOLEAN_PRIMITIVE, anyValue))
    .put("isInteger", method(Constraint.BOOLEAN_PRIMITIVE, anyValue))
    .put("isSafeInteger", method(Constraint.BOOLEAN_PRIMITIVE, anyValue))
    .put("parseFloat", method(Constraint.NUMBER_PRIMITIVE, ONE_STRING))
    .put("parseInt", method(Constraint.NUMBER_PRIMITIVE, STRING_NUMBER))

    .put("EPSILON", property(constraintOnRecentProperty(Constraint.TRUTHY_NUMBER_PRIMITIVE)))
    .put("MAX_SAFE_INTEGER", property(constraintOnRecentProperty(Constraint.TRUTHY_NUMBER_PRIMITIVE)))
    .put("MAX_VALUE", property(Constraint.TRUTHY_NUMBER_PRIMITIVE))
    .put("MIN_SAFE_INTEGER", property(constraintOnRecentProperty(Constraint.TRUTHY_NUMBER_PRIMITIVE)))
    .put("MIN_VALUE", property(Constraint.TRUTHY_NUMBER_PRIMITIVE))
    .put("NaN", property(Constraint.NAN))
    .put("NEGATIVE_INFINITY", property(Constraint.TRUTHY_NUMBER_PRIMITIVE))
    .put("POSITIVE_INFINITY", property(Constraint.TRUTHY_NUMBER_PRIMITIVE))
    .build();

  private NumberBuiltInProperties() {
  }

}
