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
import org.sonar.javascript.se.sv.SimpleSymbolicValue;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.fest.assertions.Assertions.assertThat;

public class LiteralProgramPointTest extends JavaScriptTreeModelTest {

  private int operandsNumber = 0;

  @Test
  public void numeric_literal() throws Exception {
    Tree tree = tree("42", Kind.NUMERIC_LITERAL);
    assertExpressionConstraint(tree, Constraint.POSITIVE_NUMBER_PRIMITIVE);
  }

  @Test
  public void template_literal() throws Exception {
    operandsNumber = 3;
    Tree tree = tree("`${a} ${b} ${c}`", Kind.TEMPLATE_LITERAL);
    assertExpressionConstraint(tree, Constraint.STRING_PRIMITIVE);
  }

  @Test
  public void string_literal() throws Exception {
    Tree tree = tree("'str'", Kind.STRING_LITERAL);
    assertExpressionConstraint(tree, Constraint.TRUTHY_STRING_PRIMITIVE);
  }

  @Test
  public void boolean_literal() throws Exception {
    Tree tree = tree("true", Kind.BOOLEAN_LITERAL);
    assertExpressionConstraint(tree, Constraint.TRUE);
  }

  @Test
  public void null_literal() throws Exception {
    Tree tree = tree("null", Kind.NULL_LITERAL);
    assertExpressionValue(tree, SpecialSymbolicValue.NULL);
  }

  @Test
  public void undefined() throws Exception {
    Tree tree = tree("undefined", Kind.IDENTIFIER_REFERENCE);
    assertExpressionValue(tree, SpecialSymbolicValue.UNDEFINED);
  }

  @Test
  public void array_literal() throws Exception {
    operandsNumber = 4;
    Tree tree = tree("[a, b, c, d]", Kind.ARRAY_LITERAL);
    assertExpressionConstraint(tree, Constraint.ARRAY);
  }

  @Test
  public void object_literal() throws Exception {
    Tree tree;

    operandsNumber = 1;

    tree = tree("x = {...a}", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);

    tree = tree("x = {a: b}", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);


    operandsNumber = 2;

    tree = tree("x = {'str': b}", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);

    tree = tree("x = {42: b}", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);

    tree = tree("x = { method(){} }", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);

    tree = tree("x = { a }", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);

    tree = tree("x = { a, b }", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);


    operandsNumber = 3;

    tree = tree("x = { a, b: foo(), ... rest }", Kind.OBJECT_LITERAL);
    assertExpressionConstraint(tree, Constraint.OTHER_OBJECT);
  }

  private void assertExpressionConstraint(Tree tree, Constraint operandConstraint) {
    ProgramState newState = getProgramState(tree);
    assertThat(newState.getConstraint(newState.peekStack())).isEqualTo(operandConstraint);
  }

  private void assertExpressionValue(Tree tree, SymbolicValue value) {
    ProgramState newState = getProgramState(tree);
    assertThat(newState.peekStack()).isEqualTo(value);
    newState.clearStack(tree);
  }

  private ProgramState getProgramState(Tree tree) {
    ProgramState state = ProgramState.emptyState();
    for (int i = 0; i < operandsNumber; i++) {
      state = state.pushToStack(new SimpleSymbolicValue(42));
    }

    ProgramPoint point = new LiteralProgramPoint(tree);
    return point.execute(state).get();
  }

  private Tree tree(String expression, Kind treeKind) throws Exception {
    return parse(expression, treeKind);
  }
}
