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
package org.sonar.javascript.se.points;

import java.util.Optional;
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

  @Test
  public void numeric_literal() throws Exception {
    Tree tree = tree("42", Kind.NUMERIC_LITERAL);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(ProgramState.emptyState());
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
  }

  @Test
  public void template_literal() throws Exception {
    int operandsNumber = 3;
    Tree tree = tree("`${a} ${b} ${c}`", Kind.TEMPLATE_LITERAL);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.STRING_PRIMITIVE);
  }

  @Test
  public void string_literal() throws Exception {
    Tree tree = tree("'str'", Kind.STRING_LITERAL);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(ProgramState.emptyState());
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.TRUTHY_STRING_PRIMITIVE);
  }

  @Test
  public void boolean_literal() throws Exception {
    Tree tree = tree("true", Kind.BOOLEAN_LITERAL);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(ProgramState.emptyState());
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.TRUE);
  }

  @Test
  public void null_literal() throws Exception {
    Tree tree = tree("null", Kind.NULL_LITERAL);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(ProgramState.emptyState());
    assertThat(resultingValue(newState)).isEqualTo(SpecialSymbolicValue.NULL);
    assertThat(stackSize(newState)).isEqualTo(1);
  }

  @Test
  public void undefined() throws Exception {
    Tree tree = tree("undefined", Kind.IDENTIFIER_REFERENCE);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(ProgramState.emptyState());
    assertThat(resultingValue(newState)).isEqualTo(SpecialSymbolicValue.UNDEFINED);
    assertThat(stackSize(newState)).isEqualTo(1);
  }

  @Test
  public void array_literal() throws Exception {
    int operandsNumber = 4;
    Tree tree = tree("[a, b, c, d]", Kind.ARRAY_LITERAL);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.ARRAY);
  }

  @Test
  public void object_literal() throws Exception {
    Tree tree;

    int operandsNumber = 1;

    tree = tree("x = {...a}", Kind.OBJECT_LITERAL);
    Optional<ProgramState> newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);

    tree = tree("x = {a: b}", Kind.OBJECT_LITERAL);
    newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);


    operandsNumber = 2;

    tree = tree("x = {'str': b}", Kind.OBJECT_LITERAL);
    newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);

    tree = tree("x = {42: b}", Kind.OBJECT_LITERAL);
    newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);

    tree = tree("x = { method(){} }", Kind.OBJECT_LITERAL);
    newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);

    tree = tree("x = { a }", Kind.OBJECT_LITERAL);
    newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);

    tree = tree("x = { a, b }", Kind.OBJECT_LITERAL);
    newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);


    operandsNumber = 3;

    tree = tree("x = { a, b: foo(), ... rest }", Kind.OBJECT_LITERAL);
    newState = new LiteralProgramPoint(tree).execute(createProgramState(operandsNumber));
    assertThat(resultingConstraint(newState)).isEqualTo(Constraint.OTHER_OBJECT);
  }

  private int stackSize(Optional<ProgramState> newState) {
    return newState.get().getStack().size();
  }

  private Constraint resultingConstraint(Optional<ProgramState> newState) {
    return newState.get().getConstraint(resultingValue(newState));
  }

  private SymbolicValue resultingValue(Optional<ProgramState> newState) {
    return newState.get().peekStack();
  }

  private ProgramState createProgramState(int operandsNumber) {
    ProgramState state = ProgramState.emptyState();
    for (int i = 0; i < operandsNumber; i++) {
      state = state.pushToStack(new SimpleSymbolicValue(42));
    }
    return state;
  }

  private Tree tree(String expression, Kind treeKind) throws Exception {
    return parse(expression, treeKind);
  }
}
