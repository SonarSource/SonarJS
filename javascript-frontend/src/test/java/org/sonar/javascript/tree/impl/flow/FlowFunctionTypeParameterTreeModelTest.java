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
package org.sonar.javascript.tree.impl.flow;

import java.util.Objects;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeRestParameterTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowFunctionTypeParameterTreeModelTest extends JavaScriptTreeModelTest {
  @Test
  public void simple_parameter() throws Exception {
    FlowFunctionTypeParameterTree tree = parse("par1: string", Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER, Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER)).isTrue();
    assertThat(tree.type().is(Tree.Kind.FLOW_SIMPLE_TYPE)).isTrue();
    assertThat(tree.identifier().name()).isEqualTo("par1");
    assertThat(tree.typeAnnotation()).isNotNull();
    assertThat(tree.childrenStream().filter(Objects::nonNull).count()).isEqualTo(2);
  }

  @Test
  public void implicit_parameter_name() throws Exception {
    FlowFunctionTypeParameterTree tree = parse("number", Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER, Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER)).isTrue();
    assertThat(tree.type().is(Tree.Kind.FLOW_SIMPLE_TYPE)).isTrue();
    assertThat(tree.identifier()).isNull();
    assertThat(tree.typeAnnotation()).isNull();
    assertThat(tree.childrenStream().filter(Objects::nonNull).count()).isEqualTo(1);
  }

  @Test
  public void rest_parameter() throws Exception {
    FlowFunctionTypeRestParameterTree tree = parse("...numbers?: ManyNumbers", Tree.Kind.FLOW_FUNCTION_TYPE_REST_PARAMETER, Tree.Kind.FLOW_FUNCTION_TYPE_REST_PARAMETER);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_REST_PARAMETER)).isTrue();
    assertThat(tree.type().is(Tree.Kind.FLOW_SIMPLE_TYPE)).isTrue();
    assertThat(tree.identifier().name()).isEqualTo("numbers");
    assertThat(tree.typeAnnotation()).isNotNull();
    assertThat(tree.query()).isNotNull();
    assertThat(tree.childrenStream().filter(Objects::nonNull).count()).isEqualTo(2);
  }

  @Test
  public void optional_parameter() throws Exception {
    FlowFunctionTypeParameterTree tree = parse("middleName?: string", Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER, Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER)).isTrue();
    assertThat(tree.type().is(Tree.Kind.FLOW_SIMPLE_TYPE)).isTrue();
    assertThat(tree.identifier().name()).isEqualTo("middleName");
    assertThat(tree.query()).isNotNull();
    assertThat(tree.typeAnnotation()).isNotNull();
    assertThat(tree.childrenStream().filter(Objects::nonNull).count()).isEqualTo(3);
  }

}
