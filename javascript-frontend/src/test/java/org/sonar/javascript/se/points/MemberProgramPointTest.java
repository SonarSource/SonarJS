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

import java.util.Optional;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Java6Assertions.assertThat;
import static org.sonar.javascript.se.points.ProgramPointTest.tree;

public class MemberProgramPointTest {

  private static final SymbolicValueWithConstraint NULL = new SymbolicValueWithConstraint(Constraint.NULL);
  private static final SymbolicValueWithConstraint UNDEFINED = new SymbolicValueWithConstraint(Constraint.UNDEFINED);
  private static final SymbolicValueWithConstraint ZERO = new SymbolicValueWithConstraint(Constraint.ZERO);
  private static final SymbolicValueWithConstraint ANY_VALUE = new SymbolicValueWithConstraint(Constraint.ANY_VALUE);

  private MemberProgramPoint dotMemberPoint;
  private ProgramState state;
  private MemberProgramPoint bracketMemberPoint;

  @Before
  public void setUp() throws Exception {
    dotMemberPoint = new MemberProgramPoint(tree(Tree.Kind.DOT_MEMBER_EXPRESSION));
    bracketMemberPoint = new MemberProgramPoint(tree(Tree.Kind.BRACKET_MEMBER_EXPRESSION));
    state = ProgramState.emptyState();
  }

  @Test
  public void returnProgramStateWhenObjectIsDefined() throws Exception {
    state = state.pushToStack(ANY_VALUE);
    Optional<ProgramState> stateAfterDot = dotMemberPoint.execute(state);
    assertThat(dotMemberPoint.execute(state).isPresent()).isTrue();
    stateAfterDot.ifPresent(s -> assertThat(s.getConstraint(s.peekStack()).isStricterOrEqualTo(Constraint.NOT_NULLY)).isTrue());
    state = state.pushToStack(ANY_VALUE).pushToStack(ZERO);
    Optional<ProgramState> stateAfterBracket = bracketMemberPoint.execute(state);
    assertThat(stateAfterBracket.isPresent()).isTrue();
    stateAfterBracket.ifPresent(s -> assertThat(s.getConstraint(s.peekStack()).isStricterOrEqualTo(Constraint.NOT_NULLY)).isTrue());
  }

  @Test
  public void returnNoProgramStateWhenObjectIsUndefinedOrNull() throws Exception {
    state = state.pushToStack(UNDEFINED);
    assertThat(dotMemberPoint.execute(state).isPresent()).isFalse();
    state = state.pushToStack(NULL);
    assertThat(dotMemberPoint.execute(state).isPresent()).isFalse();
    state = state.pushToStack(UNDEFINED).pushToStack(ZERO);
    assertThat(bracketMemberPoint.execute(state).isPresent()).isFalse();
    state = state.pushToStack(NULL).pushToStack(ZERO);
    assertThat(bracketMemberPoint.execute(state).isPresent()).isFalse();
  }

  @Test
  public void ignoresArrayIndexValue() throws Exception {
    state = state.pushToStack(ANY_VALUE).pushToStack(UNDEFINED);
    assertThat(bracketMemberPoint.execute(state).isPresent()).isTrue();
  }

  @Test
  public void matchingTrees() throws Exception {
    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.DOT_MEMBER_EXPRESSION))).isTrue();
    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.BRACKET_MEMBER_EXPRESSION))).isTrue();

    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.FOR_OF_STATEMENT))).isFalse();
    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.AND_ASSIGNMENT))).isFalse();
  }
}
