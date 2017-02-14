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

import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Java6Assertions.assertThat;
import static org.sonar.javascript.se.points.ProgramPointTest.tree;

public class MemberProgramPointTest {

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
    state = state.pushToStack(new SymbolicValueWithConstraint(Constraint.ANY_VALUE));
    assertThat(dotMemberPoint.execute(state).isPresent()).isTrue();
    state = state.pushToStack(new SymbolicValueWithConstraint(Constraint.ANY_VALUE)).pushToStack(new SymbolicValueWithConstraint(Constraint.ZERO));
    assertThat(bracketMemberPoint.execute(state).isPresent()).isTrue();
  }

  @Test
  public void returnNoProgramStateWhenObjectIsUndefined() throws Exception {
    state = state.pushToStack(new SymbolicValueWithConstraint(Constraint.UNDEFINED));
    assertThat(dotMemberPoint.execute(state).isPresent()).isFalse();
    state = state.pushToStack(new SymbolicValueWithConstraint(Constraint.UNDEFINED)).pushToStack(new SymbolicValueWithConstraint(Constraint.ZERO));
    assertThat(bracketMemberPoint.execute(state).isPresent()).isFalse();
  }

  @Test
  public void matchingTrees() throws Exception {
    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.DOT_MEMBER_EXPRESSION))).isTrue();
    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.BRACKET_MEMBER_EXPRESSION))).isTrue();

    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.FOR_OF_STATEMENT))).isFalse();
    assertThat(MemberProgramPoint.originatesFrom(tree(Tree.Kind.AND_ASSIGNMENT))).isFalse();
  }
}
