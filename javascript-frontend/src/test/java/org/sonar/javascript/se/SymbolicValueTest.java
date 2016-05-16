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

import com.google.common.base.Charsets;
import com.sonar.sslr.api.typed.ActionParser;
import org.junit.Test;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;

import static org.fest.assertions.Assertions.assertThat;
import static org.sonar.javascript.se.Nullability.NOT_NULL;
import static org.sonar.javascript.se.Nullability.NULL;
import static org.sonar.javascript.se.Truthiness.FALSY;
import static org.sonar.javascript.se.Truthiness.TRUTHY;
import static org.sonar.javascript.se.Truthiness.UNKNOWN;

public class SymbolicValueTest {

  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser(Charsets.UTF_8);

  @Test
  public void null_value() throws Exception {
    SymbolicValue value = symbolicValue("null");
    assertThat(value.nullability()).isEqualTo(NULL);
    assertThat(value.truthiness()).isEqualTo(FALSY);
  }

  @Test
  public void undefined_value() throws Exception {
    SymbolicValue value = symbolicValue("undefined");
    assertThat(value.nullability()).isEqualTo(NULL);
    assertThat(value.truthiness()).isEqualTo(FALSY);
  }

  @Test
  public void literals() throws Exception {
    assertThat(symbolicValue("42").nullability()).isEqualTo(NOT_NULL);
    assertThat(symbolicValue("'str'").nullability()).isEqualTo(NOT_NULL);
    assertThat(symbolicValue("0").nullability()).isEqualTo(NOT_NULL);

    assertThat(symbolicValue("'ab'").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("true").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("42").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("42.").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("42e2").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("0b01").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("0x42").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("0o42").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("0O42").truthiness()).isEqualTo(TRUTHY);
    assertThat(symbolicValue("042").truthiness()).isEqualTo(TRUTHY);

    assertThat(symbolicValue("''").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("\"\"").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("false").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("0").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("0.0").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("0.e2").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("0b0").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("0x0").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("0o0").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("0O0").truthiness()).isEqualTo(FALSY);
    assertThat(symbolicValue("00").truthiness()).isEqualTo(FALSY);
  }

  @Test
  public void identifier() throws Exception {
    SymbolicValue value = symbolicValue("x");
    assertThat(value.nullability()).isEqualTo(Nullability.UNKNOWN);
    assertThat(value.truthiness()).isEqualTo(UNKNOWN);
  }

  @Test
  public void test_equals() throws Exception {
    assertThat(symbolicValue("42")).isNotEqualTo(null);
    assertThat(symbolicValue("42")).isNotEqualTo("");
    assertThat(symbolicValue("42")).isEqualTo(symbolicValue("42"));
    assertThat(symbolicValue("42")).isEqualTo(symbolicValue("45"));
    assertThat(symbolicValue("42")).isNotEqualTo(symbolicValue("null"));
    assertThat(symbolicValue("x")).isNotEqualTo(symbolicValue("x").constrain(Truthiness.FALSY));
    assertThat(symbolicValue("x").constrain(FALSY)).isEqualTo(symbolicValue("x").constrain(FALSY));
  }

  @Test
  public void test_hashCode() throws Exception {
    assertThat(symbolicValue("42").hashCode()).isEqualTo(symbolicValue("42").hashCode());
  }

  @Test
  public void test_toString() throws Exception {
    assertThat(SymbolicValue.NULL_OR_UNDEFINED.toString()).isEqualTo("NULL");
    assertThat(SymbolicValue.UNKNOWN.toString()).isEqualTo("UNKNOWN");
    assertThat(SymbolicValue.TRUTHY_LITERAL.toString()).isEqualTo("TRUTHY");
    assertThat(SymbolicValue.FALSY_LITERAL.toString()).isEqualTo("FALSY");
    assertThat(symbolicValue("x").constrain(FALSY).toString()).isEqualTo("UNKNOWN_FALSY");
    assertThat(symbolicValue("x").constrain(NOT_NULL).toString()).isEqualTo("NOT_NULL");
  }

  private SymbolicValue symbolicValue(String expressionSource) {
    ScriptTree script = (ScriptTree) parser.parse(expressionSource);
    ExpressionStatementTree expressionStatement = (ExpressionStatementTree) script.items().items().get(0);
    return SymbolicValue.get((ExpressionTree) expressionStatement.expression());
  }

}
