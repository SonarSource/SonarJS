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

import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.sv.FunctionWithKnownReturnSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;

import static org.assertj.core.api.Assertions.assertThat;

public class BuiltInPropertiesTest {

  private BuiltInProperties builtInProperties;

  @Test
  public void test_string() throws Exception {
    builtInProperties = new StringBuiltInProperties();
    assertMethod(value("split"), method(Constraint.ARRAY));
    assertProperty(value("length"), Constraint.NUMBER);
    assertThat(value("foobar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
    assertMethod(value("valueOf"), method(Constraint.STRING));
  }

  @Test
  public void test_number() throws Exception {
    builtInProperties = new NumberBuiltInProperties();
    assertMethod(value("toExponential"), method(Constraint.STRING));
    assertMethod(value("valueOf"), method(Constraint.NUMBER));
    assertThat(value("foobar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
  }

  @Test
  public void test_boolean() throws Exception {
    builtInProperties = new BooleanBuiltInProperties();
    assertMethod(value("valueOf"), method(Constraint.BOOLEAN));
    assertThat(value("foobar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
  }

  @Test
  public void test_array() throws Exception {
    builtInProperties = new ArrayBuiltInProperties();
    assertMethod(value("sort"), method(Constraint.ARRAY));
    assertMethod(value("pop"), method(Constraint.ANY_VALUE));
    assertProperty(value("length"), Constraint.NUMBER);
    assertThat(value("foobar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
    // inherited
    assertMethod(value("valueOf"), method(Constraint.ANY_VALUE));
  }

  @Test
  public void test_function() throws Exception {
    builtInProperties = new FunctionBuiltInProperties();
    assertMethod(value("bind"), method(Constraint.FUNCTION));
    assertProperty(value("name"), Constraint.STRING);
    assertProperty(value("length"), Constraint.NUMBER);
    assertThat(value("foobar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
  }

  @Test
  public void test_object() throws Exception {
    builtInProperties = new ObjectBuiltInProperties();
    assertMethod(value("hasOwnProperty"), method(Constraint.BOOLEAN));
    assertProperty(value("constructor"), Constraint.FUNCTION);
    assertThat(value("foobar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
  }

  @Test
  public void test_date() throws Exception {
    builtInProperties = new DateBuiltInProperties();
    assertMethod(value("getDate"), method(Constraint.TRUTHY_NUMBER));
    assertMethod(value("setDate"), method(Constraint.NUMBER));
    assertMethod(value("toString"), method(Constraint.STRING));
    assertThat(value("foobar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
  }

  @Test(expected=IllegalStateException.class)
  public void test_null() throws Exception {
    builtInProperties = new NullOrUndefinedBuiltInProperties();
    value("fooBar");
  }

  @Test
  public void test_inheritance() throws Exception {
    builtInProperties = new FunctionBuiltInProperties();
    assertProperty(value("constructor"), Constraint.FUNCTION);
    assertMethod(value("hasOwnProperty"), method(Constraint.BOOLEAN));

    assertThat(value("split")).isEqualTo(UnknownSymbolicValue.UNKNOWN);

  }

  private void assertProperty(SymbolicValue actual, Constraint expectedConstraint) {
    assertThat(constraint(actual)).isEqualTo(expectedConstraint);
  }

  private void assertMethod(SymbolicValue actual, FunctionWithKnownReturnSymbolicValue expected) {
    assertThat(actual).isInstanceOf(FunctionWithKnownReturnSymbolicValue.class);
    assertThat(constraint(((FunctionWithKnownReturnSymbolicValue) actual).call()))
      .isEqualTo(constraint(expected.call()));
  }

  private SymbolicValue value(String name) {
    return builtInProperties.getValueForProperty(name);
  }

  private FunctionWithKnownReturnSymbolicValue method(Constraint returnConstraint) {
    return BuiltInProperties.method(returnConstraint);
  }

  private Constraint constraint(SymbolicValue value) {
    assertThat(value).isInstanceOf(SymbolicValueWithConstraint.class);
    return value.baseConstraint(null);
  }
}
