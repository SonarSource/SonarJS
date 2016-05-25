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
import static org.sonar.javascript.se.Nullability.NOT_NULLY;
import static org.sonar.javascript.se.Nullability.NULL;
import static org.sonar.javascript.se.Nullability.UNDEFINED;
import static org.sonar.javascript.se.Truthiness.FALSY;
import static org.sonar.javascript.se.Truthiness.TRUTHY;

public class ConstraintTest {

  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser(Charsets.UTF_8);

  @Test
  public void null_constraint() throws Exception {
    Constraint constraint = constraint("null");
    assertThat(constraint.nullability()).isEqualTo(NULL);
    assertThat(constraint.truthiness()).isEqualTo(FALSY);
  }

  @Test
  public void undefined_constraint() throws Exception {
    Constraint constraint = constraint("undefined");
    assertThat(constraint.nullability()).isEqualTo(UNDEFINED);
    assertThat(constraint.truthiness()).isEqualTo(FALSY);
  }

  @Test
  public void literals() throws Exception {
    assertThat(constraint("42").nullability()).isEqualTo(NOT_NULLY);
    assertThat(constraint("'str'").nullability()).isEqualTo(NOT_NULLY);
    assertThat(constraint("0").nullability()).isEqualTo(NOT_NULLY);

    assertThat(constraint("'ab'").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("true").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("42").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("42.").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("42e2").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("0b01").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("0x42").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("0o42").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("0O42").truthiness()).isEqualTo(TRUTHY);
    assertThat(constraint("042").truthiness()).isEqualTo(TRUTHY);

    assertThat(constraint("''").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("\"\"").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("false").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("0").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("0.0").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("0.e2").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("0b0").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("0x0").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("0o0").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("0O0").truthiness()).isEqualTo(FALSY);
    assertThat(constraint("00").truthiness()).isEqualTo(FALSY);
  }

  @Test
  public void identifier() throws Exception {
    assertThat(constraint("x")).isNull();
  }

  @Test
  public void test_equals() throws Exception {
    assertThat(constraint("42")).isNotEqualTo(null);
    assertThat(constraint("42")).isNotEqualTo("");
    assertThat(constraint("42")).isEqualTo(constraint("42"));
    assertThat(constraint("42")).isEqualTo(constraint("45"));
    assertThat(constraint("42")).isNotEqualTo(constraint("null"));
    assertThat(constraint("x")).isNotEqualTo(Constraint.constrain(constraint("x"), FALSY));
    assertThat(Constraint.constrain(constraint("x"), FALSY)).isEqualTo(Constraint.constrain(constraint("x"), FALSY));
  }

  @Test
  public void test_hashCode() throws Exception {
    assertThat(constraint("42").hashCode()).isEqualTo(constraint("42").hashCode());
  }

  @Test
  public void test_toString() throws Exception {
    assertThat(Constraint.NULLY.toString()).isEqualTo("{ nullability = NULLY, truthiness = FALSY }");
    assertThat(Constraint.NULL.toString()).isEqualTo("{ nullability = NULL, truthiness = FALSY }");
    assertThat(Constraint.NOT_NULL.toString()).isEqualTo("{ nullability = NOT_NULL, truthiness = UNKNOWN }");
    assertThat(Constraint.NOT_UNDEFINED.toString()).isEqualTo("{ nullability = NOT_UNDEFINED, truthiness = UNKNOWN }");
    assertThat(Constraint.UNDEFINED.toString()).isEqualTo("{ nullability = UNDEFINED, truthiness = FALSY }");
    assertThat(Constraint.TRUTHY.toString()).isEqualTo("{ nullability = NOT_NULLY, truthiness = TRUTHY }");
    assertThat(Constraint.FALSY_LITERAL.toString()).isEqualTo("{ nullability = NOT_NULLY, truthiness = FALSY }");
    assertThat(Constraint.constrain(constraint("x"), FALSY).toString()).isEqualTo("{ nullability = UNKNOWN, truthiness = FALSY }");
    assertThat(Constraint.constrain(constraint("x"), NOT_NULLY).toString()).isEqualTo("{ nullability = NOT_NULLY, truthiness = UNKNOWN }");
  }

  private Constraint constraint(String expressionSource) {
    ScriptTree script = (ScriptTree) parser.parse(expressionSource);
    ExpressionStatementTree expressionStatement = (ExpressionStatementTree) script.items().items().get(0);
    return Constraint.get((ExpressionTree) expressionStatement.expression());
  }

}
