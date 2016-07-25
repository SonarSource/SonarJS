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
import com.google.common.collect.ImmutableList;
import com.sonar.sslr.api.typed.ActionParser;
import org.junit.Test;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.se.sv.EqualToSymbolicValue;
import org.sonar.javascript.se.sv.LiteralSymbolicValue;
import org.sonar.javascript.se.sv.LogicalNotSymbolicValue;
import org.sonar.javascript.se.sv.SimpleSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.TypeOfSymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;

import static org.fest.assertions.Assertions.assertThat;
import static org.sonar.javascript.se.ExpressionStack.emptyStack;
import static org.sonar.javascript.se.sv.UnknownSymbolicValue.UNKNOWN;

public class ExpressionStackTest {

  private ExpressionStack stack = ExpressionStack.emptyStack();
  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser(Charsets.UTF_8);
  private SymbolicValue simple1 = new SimpleSymbolicValue(1);
  private SymbolicValue simple2 = new SimpleSymbolicValue(2);

  @Test
  public void null_value() throws Exception {
    execute("null");
    assertSingleValueInStack(SpecialSymbolicValue.NULL);
  }

  @Test(expected = IllegalArgumentException.class)
  public void identifier() throws Exception {
    execute("a");
  }

  @Test
  public void numeric_literal() throws Exception {
    execute("42");
    assertSingleValueInStack(LiteralSymbolicValue.class);
  }

  @Test
  public void logical_not() throws Exception {
    pushSimpleValues(1);
    execute("!a");
    assertSingleValueInStack(LogicalNotSymbolicValue.class);
  }

  @Test
  public void equal_unknown() throws Exception {
    pushValues(simple1, UNKNOWN);
    execute("a == null");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void equal_null() throws Exception {
    pushValues(simple1, SpecialSymbolicValue.NULL);
    execute("a == null");
    assertSingleValueInStack(new EqualToSymbolicValue(simple1, Constraint.NULL_OR_UNDEFINED));
  }

  @Test
  public void null_equal() throws Exception {
    pushValues(SpecialSymbolicValue.NULL, simple1);
    execute("null == a");
    assertSingleValueInStack(new EqualToSymbolicValue(simple1, Constraint.NULL_OR_UNDEFINED));
  }

  @Test
  public void not_equal_null() throws Exception {
    pushValues(simple1, SpecialSymbolicValue.NULL);
    execute("a != null");
    assertSingleValueInStack(new EqualToSymbolicValue(simple1, Constraint.NOT_NULLY));
  }

  @Test
  public void strict_equal_null() throws Exception {
    pushValues(simple1, SpecialSymbolicValue.NULL);
    execute("a === null");
    assertSingleValueInStack(new EqualToSymbolicValue(simple1, Constraint.NULL));
  }

  @Test
  public void strict_not_equal_null() throws Exception {
    pushValues(simple1, SpecialSymbolicValue.NULL);
    execute("a !== null");
    assertSingleValueInStack(new EqualToSymbolicValue(simple1, Constraint.NULL.not()));
  }

  @Test
  public void typeof() throws Exception {
    pushValues(simple1);
    execute("typeof a");
    assertSingleValueInStack(TypeOfSymbolicValue.class);
  }

  @Test
  public void new_expression() throws Exception {
    pushValues(simple1);
    execute("new a");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void call_expression() throws Exception {
    pushSimpleValues(3);
    execute("a(b, c)");
    assertSingleValueInStack(UnknownSymbolicValue.class);
  }

  @Test
  public void array_literal() throws Exception {
    pushSimpleValues(3);
    execute("[a, b, c]");
    assertSingleValueInStack(UnknownSymbolicValue.class);
  }

  @Test
  public void template_literal() throws Exception {
    pushSimpleValues(3);
    execute("`${a} ${b} ${c}`");
    assertSingleValueInStack(UnknownSymbolicValue.class);
  }

  @Test
  public void comma_operator() throws Exception {
    pushSimpleValues(2);
    execute("a, b");
    assertSingleValueInStack(SimpleSymbolicValue.class);
  }

  @Test
  public void arrow_function() throws Exception {
    execute("() => { foo(); }");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void await_expression() throws Exception {
    pushSimpleValues(1);
    execute("await foo");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void class_expression() throws Exception {
    execute("class {}");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void isEmpty() throws Exception {
    assertThat(emptyStack().isEmpty()).isTrue();
    assertThat(emptyStack().push(simple1).isEmpty()).isFalse();
  }

  @Test
  public void equals() throws Exception {
    assertThat(emptyStack().push(simple1)).isEqualTo(emptyStack().push(simple1));
    assertThat(emptyStack().push(simple1)).isNotEqualTo(emptyStack().push(simple2));
    assertThat(emptyStack().push(simple1)).isNotEqualTo("");
  }

  @Test
  public void hash_code() throws Exception {
    assertThat(emptyStack().push(simple1).hashCode()).isEqualTo(emptyStack().push(simple1).hashCode());
  }

  @Test
  public void to_string() throws Exception {
    assertThat(emptyStack().push(simple1).toString()).isEqualTo(ImmutableList.of(simple1).toString());
  }

  private void assertSingleValueInStack(Class<? extends SymbolicValue> expectedClass) {
    assertThat(stack.size()).isEqualTo(1);
    assertThat(stack.peek()).isInstanceOf(expectedClass);
  }

  private void assertSingleValueInStack(SymbolicValue expected) {
    assertThat(stack.size()).isEqualTo(1);
    assertThat(stack.peek()).isEqualTo(expected);
  }

  private void pushSimpleValues(int numberOfValues) {
    for (int i = 0; i < numberOfValues; i++) {
      stack = stack.push(new SimpleSymbolicValue(i));
    }
  }

  private void pushValues(SymbolicValue... values) {
    for (SymbolicValue value : values) {
      stack = stack.push(value);
    }
  }

  private void execute(String expressionSource) {
    ScriptTree script = (ScriptTree) parser.parse(expressionSource);
    Tree tree = script.items().items().get(0);
    if (tree.is(Kind.EXPRESSION_STATEMENT)) {
      ExpressionStatementTree expressionStatement = (ExpressionStatementTree) tree;
      ExpressionTree expression = (ExpressionTree) expressionStatement.expression();
      stack = stack.execute(expression);
    } else {
      stack = stack.execute((ExpressionTree) tree);
    }
  }

}
