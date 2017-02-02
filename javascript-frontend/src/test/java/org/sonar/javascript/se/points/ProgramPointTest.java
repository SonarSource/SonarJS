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
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ProgramPointTest {

  @Test
  public void test_factory() throws Exception {
    assertThat(ProgramPoint.create(tree(Kind.PLUS))).isInstanceOf(PlusProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.MINUS))).isInstanceOf(StrictlyArithmeticBinaryProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.BITWISE_XOR))).isInstanceOf(BitwiseBinaryProgramPoint.class);
    assertThat(ProgramPoint.create(tree(Kind.RETURN_STATEMENT))).isInstanceOf(NoActionProgramPoint.class);
  }

  public static Tree tree(Kind kind) {
    JavaScriptTree tree = mock(JavaScriptTree.class);
    when(tree.getKind()).thenReturn(kind);
    return tree;
  }

}
