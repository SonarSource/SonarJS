/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class UnaryNumericProgramPointTest extends JavaScriptTreeModelTest {

  @Test
  public void unary_plus() throws Exception {
    Tree tree = tree("+x", Kind.UNARY_PLUS);

    assertThat(resultingConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.ZERO);
    assertThat(resultingConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);

    assertThat(operandValueConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.ANY_VALUE);
    assertThat(operandValueConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.ZERO);
    assertThat(operandValueConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_OBJECT);
    assertThat(operandValueConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void unary_minus() throws Exception {
    Tree tree = tree("-x", Kind.UNARY_MINUS);

    assertThat(resultingConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.ZERO);
    assertThat(resultingConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);

    assertThat(operandValueConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.ANY_VALUE);
    assertThat(operandValueConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.ZERO);
    assertThat(operandValueConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_OBJECT);
    assertThat(operandValueConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void prefix_increment() throws Exception {
    Tree tree = tree("++x", Kind.PREFIX_INCREMENT);

    assertThat(resultingConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(resultingConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);

    assertThat(operandValueConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(operandValueConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void prefix_decrement() throws Exception {
    Tree tree = tree("--x", Kind.PREFIX_DECREMENT);

    assertThat(resultingConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(resultingConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);

    assertThat(operandValueConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(operandValueConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void postfix_increment() throws Exception {
    Tree tree = tree("x++", Kind.POSTFIX_INCREMENT);

    assertThat(resultingConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.ZERO);
    assertThat(resultingConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);

    assertThat(operandValueConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(operandValueConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void postfix_decrement() throws Exception {
    Tree tree = tree("x--", Kind.POSTFIX_DECREMENT);

    assertThat(resultingConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.ZERO);
    assertThat(resultingConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);

    assertThat(operandValueConstraint(tree, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(operandValueConstraint(tree, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.ZERO)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(operandValueConstraint(tree, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }

  private Tree tree(String expression, Kind treeKind) throws Exception {
    return parse(expression, treeKind);
  }

  private Constraint resultingConstraint(Tree tree, Constraint operandConstraint) {
    ProgramState state = ProgramState.emptyState();
    SymbolicExecution execution = ProgramPointTest.execution();

    ProgramPoint point = new UnaryNumericProgramPoint(tree, execution);
    state = state.pushToStack(new SymbolicValueWithConstraint(operandConstraint));
    ProgramState newState = point.execute(state).get();
    return newState.getConstraint(newState.peekStack());
  }

  private Constraint operandValueConstraint(Tree tree, Constraint operandConstraint) {
    SymbolicValueWithConstraint operandSymbolValue = new SymbolicValueWithConstraint(operandConstraint);
    ProgramState state = ProgramState.emptyState();
    SymbolicExecution execution = ProgramPointTest.execution();

    Symbol symbol = mock(Symbol.class);
    when(execution.trackedVariable(any())).thenReturn(symbol);
    state = state.assignment(symbol, operandSymbolValue);

    ProgramPoint point = new UnaryNumericProgramPoint(tree, execution);
    state = state.pushToStack(operandSymbolValue);
    ProgramState newState = point.execute(state).get();
    return newState.getConstraint(symbol);
  }
}
