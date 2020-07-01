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
import java.util.function.IntFunction;
import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

import static org.assertj.core.api.Assertions.assertThat;

public class BuiltInPropertiesTest {

  private Type type;

  @Test
  public void test_string() throws Exception {
    type = Type.STRING_PRIMITIVE;
    assertMethod(value("split"), method(Constraint.ARRAY));
    assertProperty(value("length"), Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(value("foobar")).isEqualTo(SpecialSymbolicValue.UNDEFINED);
    assertMethod(value("valueOf"), method(Constraint.STRING_PRIMITIVE));
  }

  @Test
  public void test_ember_string_extension() throws Exception {
    type = Type.STRING_PRIMITIVE;
    assertMethod(value("camelize"), method(Constraint.STRING_PRIMITIVE));
    assertMethod(value("w"), method(Constraint.ARRAY));
  }

  @Test
  public void test_number() throws Exception {
    type = Type.NUMBER_PRIMITIVE;
    assertMethod(value("toExponential"), method(Constraint.TRUTHY_STRING_PRIMITIVE));
    assertMethod(value("valueOf"), method(Constraint.NUMBER_PRIMITIVE));
    assertThat(value("foobar")).isEqualTo(SpecialSymbolicValue.UNDEFINED);
  }

  @Test
  public void test_boolean() throws Exception {
    type = Type.BOOLEAN_PRIMITIVE;
    assertMethod(value("valueOf"), method(Constraint.BOOLEAN_PRIMITIVE));
    assertThat(value("foobar")).isEqualTo(SpecialSymbolicValue.UNDEFINED);
  }

  @Test
  public void test_array() throws Exception {
    type = Type.ARRAY;
    assertMethod(value("sort"), method(Constraint.ARRAY));
    assertMethod(value("pop"), method(Constraint.ANY_VALUE));
    assertProperty(value("length"), Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(value("foobar")).isEqualTo(SpecialSymbolicValue.UNDEFINED);
    // inherited
    assertMethod(value("valueOf"), method(Constraint.ANY_VALUE));
  }

  @Test
  public void test_function() throws Exception {
    type = Type.FUNCTION;
    assertMethod(value("bind"), method(Constraint.FUNCTION));
    assertProperty(value("name"), Constraint.STRING_PRIMITIVE);
    assertProperty(value("length"), Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(value("foobar")).isEqualTo(SpecialSymbolicValue.UNDEFINED);
  }

  @Test
  public void test_object() throws Exception {
    type = Type.OBJECT;
    assertMethod(value("hasOwnProperty"), method(Constraint.BOOLEAN_PRIMITIVE));
    assertProperty(value("constructor"), Constraint.ANY_VALUE);
    assertThat(value("foobar")).isEqualTo(SpecialSymbolicValue.UNDEFINED);
  }

  @Test
  public void test_date() throws Exception {
    type = Type.DATE;
    assertMethod(value("getDate"), method(Constraint.TRUTHY_NUMBER_PRIMITIVE));
    assertMethod(value("setDate"), method(Constraint.NUMBER_PRIMITIVE));
    assertMethod(value("toString"), method(Constraint.TRUTHY_STRING_PRIMITIVE));
    assertThat(value("foobar")).isEqualTo(SpecialSymbolicValue.UNDEFINED);
  }

  @Test(expected=IllegalStateException.class)
  public void test_null() throws Exception {
    type = Type.NULL;
    value("fooBar");
  }

  @Test(expected=IllegalStateException.class)
  public void test_undefined() throws Exception {
    type = Type.UNDEFINED;
    value("fooBar");
  }

  @Test
  public void test_inheritance() throws Exception {
    type = Type.FUNCTION;
    assertProperty(value("constructor"), Constraint.ANY_VALUE);
    assertMethod(value("hasOwnProperty"), method(Constraint.BOOLEAN_PRIMITIVE));

    assertThat(value("split")).isEqualTo(SpecialSymbolicValue.UNDEFINED);

  }

  @Test
  public void replace_method_signature() throws Exception {
    type = Type.STRING_PRIMITIVE;
    IntFunction<Constraint> replaceSignature = ((BuiltInFunctionSymbolicValue) value("replace")).signature();
    assertThat(replaceSignature.apply(0)).isEqualTo(Constraint.ANY_STRING.or(Constraint.REGEXP));
    assertThat(replaceSignature.apply(1)).isEqualTo(Constraint.ANY_STRING.or(Constraint.FUNCTION));
    assertThat(replaceSignature.apply(2)).isNull();
    assertThat(replaceSignature.apply(42)).isNull();
  }

  @Test
  public void concat_method_signature() throws Exception {
    type = Type.STRING_PRIMITIVE;
    IntFunction<Constraint> replaceSignature = ((BuiltInFunctionSymbolicValue) value("concat")).signature();
    assertThat(replaceSignature.apply(0)).isEqualTo(Constraint.ANY_STRING);
    assertThat(replaceSignature.apply(1)).isEqualTo(Constraint.ANY_STRING);
    assertThat(replaceSignature.apply(2)).isEqualTo(Constraint.ANY_STRING);
    assertThat(replaceSignature.apply(42)).isEqualTo(Constraint.ANY_STRING);
  }

  @Test
  public void startsWith_method_signature() throws Exception {
    type = Type.STRING_PRIMITIVE;
    BuiltInFunctionSymbolicValue value = (BuiltInFunctionSymbolicValue) value("startsWith");
    IntFunction<Constraint> replaceSignature = value.signature();
    assertThat(replaceSignature.apply(0)).isEqualTo(Constraint.ANY_STRING);
    assertThat(replaceSignature.apply(1)).isEqualTo(Constraint.ANY_NUMBER);
    assertThat(replaceSignature.apply(2)).isNull();
    assertThat(replaceSignature.apply(42)).isNull();
  }

  @Test
  public void valueOf_method_signature() throws Exception {
    type = Type.NUMBER_PRIMITIVE;
    IntFunction<Constraint> replaceSignature = ((BuiltInFunctionSymbolicValue) value("valueOf")).signature();
    assertThat(replaceSignature.apply(0)).isNull();
    assertThat(replaceSignature.apply(42)).isNull();
  }

  @Test
  public void toLocaleString_method_signature() throws Exception {
    type = Type.NUMBER_PRIMITIVE;
    IntFunction<Constraint> replaceSignature = ((BuiltInFunctionSymbolicValue) value("toLocaleString")).signature();
    assertThat(replaceSignature.apply(0)).isEqualTo(Constraint.ANY_STRING.or(Constraint.ARRAY));
    assertThat(replaceSignature.apply(1)).isEqualTo(Constraint.OBJECT);
    assertThat(replaceSignature.apply(2)).isNull();
    assertThat(replaceSignature.apply(42)).isNull();
  }

  @Test
  public void reduce_method_signature() throws Exception {
    type = Type.ARRAY;
    IntFunction<Constraint> replaceSignature = ((BuiltInFunctionSymbolicValue) value("reduce")).signature();
    assertThat(replaceSignature.apply(0)).isEqualTo(Constraint.FUNCTION);
    assertThat(replaceSignature.apply(1)).isEqualTo(Constraint.ANY_VALUE);
    assertThat(replaceSignature.apply(2)).isNull();
    assertThat(replaceSignature.apply(42)).isNull();
  }

  @Test
  public void setFullYear_method_signature() throws Exception {
    type = Type.DATE;
    IntFunction<Constraint> replaceSignature = ((BuiltInFunctionSymbolicValue) value("setFullYear")).signature();
    assertThat(replaceSignature.apply(0)).isEqualTo(Constraint.ANY_NUMBER);
    assertThat(replaceSignature.apply(1)).isEqualTo(Constraint.ANY_NUMBER);
    assertThat(replaceSignature.apply(2)).isEqualTo(Constraint.ANY_NUMBER);
    assertThat(replaceSignature.apply(3)).isNull();
  }

  @Test
  public void no_method_signature() throws Exception {
    type = Type.STRING_PRIMITIVE;
    assertThat(((BuiltInFunctionSymbolicValue) value("camelize")).signature()).isNull();
  }

  @Test
  public void class_method_signature() throws Exception {
    BuiltInObjectSymbolicValue mathValue = (BuiltInObjectSymbolicValue) BuiltInObjectSymbolicValue.find("Math").get();
    BuiltInFunctionSymbolicValue minMethod = (BuiltInFunctionSymbolicValue) mathValue.getPropertyValue("min");
    IntFunction<Constraint> signature = minMethod.signature();
    assertThat(signature.apply(0)).isEqualTo(Constraint.ANY_NUMBER);
    assertThat(signature.apply(1)).isEqualTo(Constraint.ANY_NUMBER);
    assertThat(signature.apply(42)).isEqualTo(Constraint.ANY_NUMBER);
  }

  @Test
  public void regexp_method_signature() throws Exception {
    type = Type.REGEXP;
    IntFunction<Constraint> signature = ((BuiltInFunctionSymbolicValue) value("test")).signature();
    assertThat(signature.apply(0)).isEqualTo(Constraint.ANY_STRING);
    assertThat(signature.apply(1)).isNull();
    assertThat(signature.apply(42)).isNull();
  }

  private void assertProperty(SymbolicValue actual, Constraint expectedConstraint) {
    assertThat(constraint(actual)).isEqualTo(expectedConstraint);
  }

  private void assertMethod(SymbolicValue actual, BuiltInFunctionSymbolicValue expected) {
    assertThat(actual).isInstanceOf(BuiltInFunctionSymbolicValue.class);
    assertThat(constraint(((BuiltInFunctionSymbolicValue) actual).call(ImmutableList.of())))
      .isEqualTo(constraint(expected.call(ImmutableList.of())));
  }

  private SymbolicValue value(String name) {
    return type.getPropertyValue(name);
  }

  private BuiltInFunctionSymbolicValue method(Constraint returnConstraint) {
    return (BuiltInFunctionSymbolicValue) BuiltInProperty.method(returnConstraint).access();
  }

  private Constraint constraint(SymbolicValue value) {
    assertThat(value).isInstanceOf(SymbolicValueWithConstraint.class);
    return value.baseConstraint(null);
  }
}
