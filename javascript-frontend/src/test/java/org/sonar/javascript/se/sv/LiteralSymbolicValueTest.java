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
package org.sonar.javascript.se.sv;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.typed.ActionParser;
import org.junit.Test;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.sonar.javascript.se.Constraint.TRUTHY_NUMBER;
import static org.sonar.javascript.se.Constraint.ZERO;

public class LiteralSymbolicValueTest {

  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser(Charsets.UTF_8);

  @Test
  public void boolean_literal() throws Exception {
    assertThat(inherentConstraint("true")).isEqualTo(Constraint.TRUE);
    assertThat(inherentConstraint("false")).isEqualTo(Constraint.FALSE);
  }

  @Test
  public void string_literal() throws Exception {
    assertThat(inherentConstraint("''")).isEqualTo(Constraint.EMPTY_STRING);
    assertThat(inherentConstraint("\"\"")).isEqualTo(Constraint.EMPTY_STRING);
    assertThat(inherentConstraint("'a'")).isEqualTo(Constraint.TRUTHY_STRING);
    assertThat(inherentConstraint("'0'")).isEqualTo(Constraint.TRUTHY_STRING);
  }

  @Test
  public void numeric_literal() throws Exception {
    assertThat(inherentConstraint("42")).isEqualTo(TRUTHY_NUMBER);
    assertThat(inherentConstraint("42.")).isEqualTo(TRUTHY_NUMBER);
    assertThat(inherentConstraint("42e2")).isEqualTo(TRUTHY_NUMBER);
    assertThat(inherentConstraint("0b01")).isEqualTo(TRUTHY_NUMBER);
    assertThat(inherentConstraint("0x42")).isEqualTo(TRUTHY_NUMBER);
    assertThat(inherentConstraint("0o42")).isEqualTo(TRUTHY_NUMBER);
    assertThat(inherentConstraint("0O42")).isEqualTo(TRUTHY_NUMBER);
    assertThat(inherentConstraint("042")).isEqualTo(TRUTHY_NUMBER);

    assertThat(inherentConstraint("0")).isEqualTo(ZERO);
    assertThat(inherentConstraint("0.0")).isEqualTo(ZERO);
    assertThat(inherentConstraint("0.e2")).isEqualTo(ZERO);
    assertThat(inherentConstraint("0b0")).isEqualTo(ZERO);
    assertThat(inherentConstraint("0x0")).isEqualTo(ZERO);
    assertThat(inherentConstraint("0o0")).isEqualTo(ZERO);
    assertThat(inherentConstraint("0O0")).isEqualTo(ZERO);
    assertThat(inherentConstraint("00")).isEqualTo(ZERO);
  }

  @Test(expected = IllegalStateException.class)
  public void unknown_literal_type() throws Exception {
    LiteralSymbolicValue.get(mock(LiteralTree.class)).inherentConstraint();
  }

  @Test
  public void constrain() throws Exception {
    ProgramState state1 = ProgramState.emptyState();
    assertThat(literal("42").constrain(state1, Constraint.TRUTHY)).containsOnly(state1);
    assertThat(literal("42").constrain(state1, Constraint.NULL)).isEmpty();
    assertThat(literal("42").constrain(state1, Constraint.FALSY)).isEmpty();
    assertThat(literal("0").constrain(state1, Constraint.FALSY)).containsOnly(state1);
    assertThat(literal("0").constrain(state1, Constraint.TRUTHY)).isEmpty();
  }

  private Constraint inherentConstraint(String source) {
    return literal(source).inherentConstraint();
  }

  private LiteralSymbolicValue literal(String source) {
    ScriptTree script = (ScriptTree) parser.parse(source);
    ExpressionStatementTree expressionStatement = (ExpressionStatementTree) script.items().items().get(0);
    return LiteralSymbolicValue.get((LiteralTree) expressionStatement.expression());
  }

}
