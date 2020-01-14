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
package org.sonar.javascript.se;

import com.google.common.collect.ImmutableList;
import com.sonar.sslr.api.typed.ActionParser;
import org.junit.Test;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.se.points.LiteralProgramPoint;
import org.sonar.javascript.se.sv.FunctionWithTreeSymbolicValue;
import org.sonar.javascript.se.sv.InstanceOfSymbolicValue;
import org.sonar.javascript.se.sv.LogicalNotSymbolicValue;
import org.sonar.javascript.se.sv.RelationalSymbolicValue;
import org.sonar.javascript.se.sv.SimpleSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.se.sv.TypeOfSymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.sonar.javascript.se.ExpressionStack.emptyStack;
import static org.sonar.javascript.se.sv.UnknownSymbolicValue.UNKNOWN;

public class ExpressionStackTest {

  private ExpressionStack stack = ExpressionStack.emptyStack();
  private ActionParser<Tree> parser = JavaScriptParserBuilder.createParser();
  private SymbolicValue simple1 = new SimpleSymbolicValue(1);
  private SymbolicValue simple2 = new SimpleSymbolicValue(2);

  private ProgramState programState = ProgramState.emptyState();

  @Test
  public void assignment_patterns() throws Exception {
    execute("[a, b] = []");
    assertSingleValueInStackWithConstraint(Constraint.ARRAY);

    execute("({a, b} = {})");
    assertSingleValueInStackWithConstraint(Constraint.OTHER_OBJECT);
  }

  @Test
  public void logical_not() throws Exception {
    execute("!a");
    assertSingleValueInStack(LogicalNotSymbolicValue.class);
  }

  @Test
  public void equal() throws Exception {
    execute("a == null");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.EQUAL_TO, simple1, SpecialSymbolicValue.NULL));
  }

  @Test
  public void not_equal() throws Exception {
    execute("a != null");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.NOT_EQUAL_TO, simple1, SpecialSymbolicValue.NULL));
  }

  @Test
  public void strict_equal() throws Exception {
    execute("a === null");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.STRICT_EQUAL_TO, simple1, SpecialSymbolicValue.NULL));
  }

  @Test
  public void strict_not_equal() throws Exception {
    execute("a !== null");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.STRICT_NOT_EQUAL_TO, simple1, SpecialSymbolicValue.NULL));
  }

  @Test
  public void typeof() throws Exception {
    execute("typeof a");
    assertSingleValueInStack(TypeOfSymbolicValue.class);
    assertSingleValueInStackWithConstraint(Constraint.STRING_PRIMITIVE);
  }

  @Test
  public void instanceof_test() throws Exception {
    execute("a instanceof Foo");
    assertSingleValueInStack(InstanceOfSymbolicValue.class);
    assertSingleValueInStackWithConstraint(Constraint.BOOLEAN_PRIMITIVE);
  }

  @Test
  public void yield() throws Exception {
    execute("yield a");
    assertSingleValueInStack(UNKNOWN);

    execute("yield");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void unknown() throws Exception {
    execute("super()");
    assertSingleValueInStack(UNKNOWN);

    execute("import()");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void delete() throws Exception {
    execute("delete a.prop");
    assertSingleValueInStack(new SymbolicValueWithConstraint(Constraint.BOOLEAN_PRIMITIVE));
  }

  @Test
  public void this_object() throws Exception {
    execute("this");
    assertSingleValueInStack(UnknownSymbolicValue.UNKNOWN);
  }

  @Test
  public void new_expression() throws Exception {
    SymbolicValueWithConstraint expected = new SymbolicValueWithConstraint(Constraint.ARRAY.or(Constraint.OBJECT));

    execute("new a");
    assertSingleValueInStack(expected);

    execute("new a(1)");
    assertSingleValueInStack(expected);

    execute("new Array(1)");
    assertSingleValueInStack(expected);

    execute("new Function('return 1;')");
    assertSingleValueInStack(expected);
  }

  @Test
  public void call_expression() throws Exception {
    execute("a(b, c)");
    assertSingleValueInStack(UnknownSymbolicValue.class);
  }

  @Test
  public void comma_operator() throws Exception {
    execute("a, b");
    assertSingleValueInStack(SimpleSymbolicValue.class);
  }

  @Test
  public void arrow_function() throws Exception {
    execute("() => { foo(); }");
    assertSingleValueInStack(FunctionWithTreeSymbolicValue.class);
    FunctionWithTreeSymbolicValue functionSV = (FunctionWithTreeSymbolicValue) stack.peek();
    assertThat(functionSV.baseConstraint(mock(ProgramState.class))).isEqualTo(Constraint.FUNCTION);
    assertThat(functionSV.getFunctionTree().is(Kind.ARROW_FUNCTION)).isTrue();
  }

  @Test
  public void empty_object_literal() throws Exception {
    execute("x = {}");
    assertSingleValueInStack(new SymbolicValueWithConstraint(Constraint.OTHER_OBJECT));
  }

  @Test
  public void await_expression() throws Exception {
    execute("await foo");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void class_expression() throws Exception {
    execute("class {}");
    assertSingleValueInStack(new SymbolicValueWithConstraint(Constraint.OTHER_OBJECT));
  }

  @Test
  public void relational_expressions() throws Exception {
    execute("a < null");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.LESS_THAN, simple1, SpecialSymbolicValue.NULL));

    execute("a <= b");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.LESS_THAN_OR_EQUAL_TO, simple1, simple1));

    execute("a > b");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.GREATER_THAN, simple1, simple1));

    execute("a >= b");
    assertSingleValueInStack(RelationalSymbolicValue.create(Kind.GREATER_THAN_OR_EQUAL_TO, simple1, simple1));
  }

  @Test
  public void number_expressions() throws Exception {
    execute("~a");
    assertSingleValueInStack(new SymbolicValueWithConstraint(Constraint.NUMBER_PRIMITIVE));
  }

  @Test
  public void flow_type_casting() throws Exception {
    execute("(a: MyType)");
    assertSingleValueInStack(UNKNOWN);
  }

  @Test
  public void jsx() throws Exception {
    execute("<></>");
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

    if (expected instanceof SymbolicValueWithConstraint) {
      assertThat(stack.peek()).isInstanceOf(SymbolicValueWithConstraint.class);
      assertThat(stack.peek().baseConstraint(mock(ProgramState.class))).isEqualTo(expected.baseConstraint(mock(ProgramState.class)));

    } else if (expected instanceof RelationalSymbolicValue) {
      assertThat(stack.peek()).isInstanceOf(RelationalSymbolicValue.class);
      RelationalSymbolicValue sv = (RelationalSymbolicValue) stack.peek();
      assertThat(sv.relationWhenTrue()).isEqualTo(((RelationalSymbolicValue) expected).relationWhenTrue());

    } else {
      assertThat(stack.peek()).isEqualTo(expected);
    }
  }

  private void assertSingleValueInStackWithConstraint(Constraint constraint) {
    assertThat(stack.size()).isEqualTo(1);
    SymbolicValue peek = stack.peek();
    assertThat(peek.baseConstraint(programState)).isEqualTo(constraint);
  }

  private void pushValues(SymbolicValue... values) {
    for (SymbolicValue value : values) {
      stack = stack.push(value);
    }
  }

  private void execute(String expressionSource) {
    stack = ExpressionStack.emptyStack();
    ScriptTree script = (ScriptTree) parser.parse(expressionSource);

    ControlFlowGraph cfg = ControlFlowGraph.build(script);
    for (Tree element : cfg.start().elements()) {

      if (element.is(Kind.IDENTIFIER_REFERENCE)) {
        pushValues(simple1);

      } else if (element.is(KindSet.LITERAL_KINDS)) {
        programState = new LiteralProgramPoint(element).execute(programState.withStack(stack)).get();
        stack = programState.getStack();

      } else if (element instanceof ExpressionTree) {
        stack = stack.execute((ExpressionTree) element, ProgramState.emptyState());
      }
    }

  }
}
