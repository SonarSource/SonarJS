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
package org.sonar.javascript.tree.symbols.type;

import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;

import static org.assertj.core.api.Assertions.assertThat;

public class ExpressionTypeTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    super.setUp("expressions.js");
  }

  @Test
  public void parenthesised() {
    Symbol par = getSymbol("par1");
    assertThat(par.types().containsOnlyAndUnique(Type.Kind.FUNCTION)).isTrue();

    par = getSymbol("par2");
    assertThat(par.types()).containsOnly(PrimitiveType.UNKNOWN);
  }

  @Test
  public void new_expression() {
    Symbol par = getSymbol("o1");
    assertThat(par.types().containsOnlyAndUnique(Kind.STRING)).isTrue();

    par = getSymbol("o2");
    assertThat(par.types()).containsOnly(PrimitiveType.BOOLEAN);

    par = getSymbol("o3");
    assertThat(par.types()).containsOnly(PrimitiveType.NUMBER);

    par = getSymbol("o4");
    assertThat(par.types().containsOnlyAndUnique(Kind.OBJECT)).isTrue();

    par = getSymbol("o5");
    assertThat(par.types().containsOnlyAndUnique(Kind.OBJECT)).isTrue();

    par = getSymbol("o6");
    assertThat(par.types().containsOnlyAndUnique(Kind.OBJECT)).isTrue();

    par = getSymbol("o7");
    assertThat(par.types().containsOnlyAndUnique(Kind.DATE)).isTrue();
  }

  @Test
  public void test_arithmetic_binary_operations() throws Exception {
    assertThat(getSymbol("exp1").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("exp2").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("exp3").types()).containsOnly(PrimitiveType.NUMBER);

    assertThat(getSymbol("exp5").types()).containsOnly(PrimitiveType.UNKNOWN);

    assertThat(getSymbol("exp6").types()).containsOnly(PrimitiveType.NUMBER);
  }

  @Test
  public void test_comparative_binary_operations() throws Exception {
    assertThat(getSymbol("exp4").types().getUniqueKnownType()).isEqualTo(PrimitiveType.BOOLEAN);
  }

  @Test
  public void test_for_in_loop_counter() throws Exception {
    Symbol counter = getSymbol("counter1");
    assertThat(counter.types()).hasSize(2);
    assertThat(counter.types().contains(Kind.UNKNOWN)).isTrue();
    assertThat(counter.types().contains(Kind.NUMBER)).isTrue();

    assertThat(getSymbol("counter2").types()).containsOnly(PrimitiveType.UNKNOWN);
  }

  @Test
  public void test_string_methods() throws Exception {

    assertThat(getSymbol("charAt").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("charCodeAt").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("concat").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("indexOf").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("lastIndexOf").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("localeCompare").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("replace").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("search").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("slice").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("split").types().getUniqueKnownType().kind()).isEqualTo(Kind.ARRAY);
    assertThat(getSymbol("substr").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("substring").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("toLocaleLowerCase").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("toLocaleUpperCase").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("toLowerCase").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("toString").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("toUpperCase").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("trim").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("valueOf").types()).containsOnly(PrimitiveType.STRING);

  }

  @Test
  public void test_unary_expressions() throws Exception {
    assertThat(getSymbol("prefixInc").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("postfixInc").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("prefixDec").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("postfixDec").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("unaryPlus").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("unaryMinus").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("logicalCompliment").types()).containsOnly(PrimitiveType.BOOLEAN);
    assertThat(getSymbol("bitwiseCompliment").types()).containsOnly(PrimitiveType.NUMBER);
    assertThat(getSymbol("typeofExpr").types()).containsOnly(PrimitiveType.STRING);
    assertThat(getSymbol("deleteExpr").types()).containsOnly(PrimitiveType.BOOLEAN);
  }

  @Test
  public void test_parameter_with_default() throws Exception {
    assertThat(getSymbol("par").types()).containsOnly(PrimitiveType.STRING);
  }
}
