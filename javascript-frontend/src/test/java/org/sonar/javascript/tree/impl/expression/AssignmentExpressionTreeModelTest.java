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
package org.sonar.javascript.tree.impl.expression;

import org.junit.Test;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;

import static org.fest.assertions.Assertions.assertThat;

public class AssignmentExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void array_assignment_pattern() throws Exception {
    AssignmentExpressionTree tree = parse("[x, y] = arr", Kind.ASSIGNMENT);

    assertThat(tree.is(Kind.ASSIGNMENT)).isTrue();
    assertThat(tree.variable().is(Kind.ARRAY_ASSIGNMENT_PATTERN)).as(((JavaScriptTree) tree.variable()).getKind().name()).isTrue();
  }

  @Test
  public void object_assignment_pattern() throws Exception {
    AssignmentExpressionTree tree = parse("({x, y} = obj)", Kind.ASSIGNMENT);

    assertThat(tree.is(Kind.ASSIGNMENT)).isTrue();
    assertThat(tree.variable().is(Kind.OBJECT_ASSIGNMENT_PATTERN)).as(((JavaScriptTree) tree.variable()).getKind().name()).isTrue();
  }

}
