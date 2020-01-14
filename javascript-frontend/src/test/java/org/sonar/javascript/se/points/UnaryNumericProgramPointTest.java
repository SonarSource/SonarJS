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
package org.sonar.javascript.se.points;

import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SymbolicExecution;
import org.sonar.javascript.se.sv.IncDecSymbolicValue;
import org.sonar.javascript.se.sv.IncDecSymbolicValue.Sign;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.se.sv.UnaryMinusSymbolicValue;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class UnaryNumericProgramPointTest extends JavaScriptTreeModelTest {

  private SymbolicValue operandValueBefore;
  private SymbolicValue operandValueAfter;
  private SymbolicValue expressionValue;

  @Test
  public void unary_plus() throws Exception {
    UnaryExpressionTree tree = tree("+x", Kind.UNARY_PLUS);

    execute(tree, Constraint.ANY_VALUE);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isInstanceOf(SymbolicValueWithConstraint.class);
    assertThat(expressionValue.baseConstraint(ProgramState.emptyState())).isEqualTo(Constraint.NUMBER_PRIMITIVE);

    execute(tree, Constraint.NUMBER_OBJECT);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isInstanceOf(SymbolicValueWithConstraint.class);
    assertThat(expressionValue.baseConstraint(ProgramState.emptyState())).isEqualTo(Constraint.NUMBER_PRIMITIVE);

    execute(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isEqualTo(operandValueBefore);

    execute(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isEqualTo(operandValueBefore);

    execute(tree, Constraint.ZERO);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isEqualTo(operandValueBefore);

    execute(tree, Constraint.NAN);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isEqualTo(operandValueBefore);
  }

  @Test
  public void unary_minus() throws Exception {
    UnaryExpressionTree tree = tree("-x", Kind.UNARY_MINUS);

    execute(tree, Constraint.ANY_VALUE);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isInstanceOf(UnaryMinusSymbolicValue.class);

    execute(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueAfter).isEqualTo(operandValueBefore);
    assertThat(expressionValue).isInstanceOf(UnaryMinusSymbolicValue.class);
  }

  @Test
  public void prefix_increment() throws Exception {
    UnaryExpressionTree tree = tree("++x", Kind.PREFIX_INCREMENT);

    execute(tree, Constraint.ANY_VALUE);
    assertThat(operandValueAfter).isEqualTo(expressionValue);
    assertThat(expressionValue).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) expressionValue).sign()).isEqualTo(Sign.PLUS);

    execute(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueAfter).isEqualTo(expressionValue);
    assertThat(expressionValue).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) expressionValue).sign()).isEqualTo(Sign.PLUS);
  }

  @Test
  public void prefix_decrement() throws Exception {
    UnaryExpressionTree tree = tree("--x", Kind.PREFIX_DECREMENT);

    execute(tree, Constraint.ANY_VALUE);
    assertThat(operandValueAfter).isEqualTo(expressionValue);
    assertThat(expressionValue).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) expressionValue).sign()).isEqualTo(Sign.MINUS);

    execute(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueAfter).isEqualTo(expressionValue);
    assertThat(expressionValue).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) expressionValue).sign()).isEqualTo(Sign.MINUS);
  }

  @Test
  public void postfix_increment() throws Exception {
    UnaryExpressionTree tree = tree("x++", Kind.POSTFIX_INCREMENT);

    execute(tree, Constraint.ANY_VALUE);
    assertThat(expressionValue).isInstanceOf(SymbolicValueWithConstraint.class);
    assertThat(expressionValue.baseConstraint(ProgramState.emptyState())).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueAfter).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) operandValueAfter).sign()).isEqualTo(Sign.PLUS);

    execute(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(expressionValue).isEqualTo(operandValueBefore);
    assertThat(operandValueAfter).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) operandValueAfter).sign()).isEqualTo(Sign.PLUS);
  }

  @Test
  public void postfix_decrement() throws Exception {
    UnaryExpressionTree tree = tree("x--", Kind.POSTFIX_DECREMENT);

    execute(tree, Constraint.ANY_VALUE);
    assertThat(expressionValue).isInstanceOf(SymbolicValueWithConstraint.class);
    assertThat(expressionValue.baseConstraint(ProgramState.emptyState())).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueAfter).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) operandValueAfter).sign()).isEqualTo(Sign.MINUS);

    execute(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(expressionValue).isEqualTo(operandValueBefore);
    assertThat(operandValueAfter).isInstanceOf(IncDecSymbolicValue.class);
    assertThat(((IncDecSymbolicValue) operandValueAfter).sign()).isEqualTo(Sign.MINUS);
  }

  private UnaryExpressionTree tree(String expression, Kind treeKind) throws Exception {
    return parse(expression, treeKind);
  }

  private void execute(UnaryExpressionTree tree, Constraint operandConstraint) {
    operandValueBefore = new SymbolicValueWithConstraint(operandConstraint);
    ProgramState state = ProgramState.emptyState();
    SymbolicExecution execution = ProgramPointTest.execution();

    Symbol symbol = mock(Symbol.class);
    when(execution.trackedVariable(any())).thenReturn(symbol);
    state = state.assignment(symbol, operandValueBefore);

    ProgramPoint point = new UnaryNumericProgramPoint(tree, execution);
    state = state.pushToStack(operandValueBefore);
    ProgramState newState = point.execute(state).get();

    this.expressionValue = newState.peekStack();
    this.operandValueAfter = newState.getSymbolicValue(symbol);
  }
}
