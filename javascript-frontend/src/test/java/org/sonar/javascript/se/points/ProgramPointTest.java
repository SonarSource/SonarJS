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

import org.junit.Test;
import org.sonar.javascript.se.SymbolicExecution;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.expression.PostfixExpressionTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ProgramPointTest {

  @Test
  public void test_factory() throws Exception {
    assertThat(ProgramPoint.create(tree(Kind.PLUS), execution())).isInstanceOf(PlusProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.MINUS), execution())).isInstanceOf(StrictlyArithmeticBinaryProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.BITWISE_XOR), execution())).isInstanceOf(BitwiseBinaryProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.RETURN_STATEMENT), execution())).isInstanceOf(NoActionProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.DOT_MEMBER_EXPRESSION), execution())).isInstanceOf(MemberProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.BRACKET_MEMBER_EXPRESSION), execution())).isInstanceOf(MemberProgramPoint.class);
    assertThat(ProgramPoint.create(postfixIncrementTree(), execution())).isInstanceOf(UnaryNumericProgramPoint.class);
  }

  public static Tree tree(Kind kind) {
    JavaScriptTree tree = mock(JavaScriptTree.class);
    when(tree.getKind()).thenReturn(kind);

    return tree;
  }

  private static PostfixExpressionTreeImpl postfixIncrementTree() {
    PostfixExpressionTreeImpl tree = mock(PostfixExpressionTreeImpl.class);
    when(tree.getKind()).thenReturn(Kind.POSTFIX_INCREMENT);

    return tree;
  }

  public static SymbolicExecution execution() {
    return mock(SymbolicExecution.class);
  }

}
