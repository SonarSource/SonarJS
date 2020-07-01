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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowGenericParameterTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void with_super() throws Exception {
    FlowGenericParameterTree tree = parse("T: SuperType", Kind.FLOW_GENERIC_PARAMETER, Kind.FLOW_GENERIC_PARAMETER);

    assertThat(tree.is(Kind.FLOW_GENERIC_PARAMETER)).isTrue();
    assertThat(tree.identifier().name()).isEqualTo("T");
    assertThat(tree.superTypeAnnotation()).isNotNull();
    assertThat(tree.equalToken()).isNull();
    assertThat(tree.defaultType()).isNull();
  }

  @Test
  public void with_default() throws Exception {
    FlowGenericParameterTree tree = parse("T = DefaultType", Kind.FLOW_GENERIC_PARAMETER, Kind.FLOW_GENERIC_PARAMETER);

    assertThat(tree.superTypeAnnotation()).isNull();
    assertThat(tree.equalToken().text()).isEqualTo("=");
    assertThat(tree.defaultType().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();
  }

}
