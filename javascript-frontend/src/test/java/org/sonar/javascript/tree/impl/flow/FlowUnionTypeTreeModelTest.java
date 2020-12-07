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
package org.sonar.javascript.tree.impl.flow;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowUnionTypeTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowUnionTypeTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowUnionTypeTree tree = parse("var x: | A | 42 | ?B", Kind.FLOW_UNION_TYPE);

    assertThat(tree.is(Kind.FLOW_UNION_TYPE)).isTrue();
    assertThat(tree.startPipeToken()).isNotNull();
    assertThat(tree.subTypes()).hasSize(3);
    assertThat(tree.subTypes().getSeparators()).hasSize(2);
    assertThat(tree.subTypes().getSeparator(0).text()).isEqualTo("|");
  }

  @Test
  public void priorities1() throws Exception {
    // A | (B => C)
    assertThat(getType("A | B => C").is(Kind.FLOW_UNION_TYPE)).isTrue();
  }

  @Test
  public void priorities2() throws Exception {
    // B => (C | A)
    assertThat(getType("B => C | A").is(Kind.FLOW_FUNCTION_TYPE)).isTrue();
  }

  @Test
  public void priorities3() throws Exception {
    // A | (B => (C | D))
    Tree tree = getType("A | B => C | D");
    assertThat(tree.is(Kind.FLOW_UNION_TYPE)).isTrue();
    assertThat(((FlowUnionTypeTree) tree).subTypes()).hasSize(2);
  }

  private FlowTypeTree getType(String type) throws Exception {
    return ((FlowTypeAnnotationTree) parse("var x:" + type, Kind.FLOW_TYPE_ANNOTATION)).type();

  }
}
