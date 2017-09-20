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

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowObjectTypeTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowObjectTypeTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void one_property() throws Exception {
    FlowObjectTypeTree tree = parse("let x:{prop1: string}", Tree.Kind.FLOW_OBJECT_TYPE);

    assertThat(tree.is(Tree.Kind.FLOW_OBJECT_TYPE)).isTrue();
    assertThat(tree.lcurlyToken()).isNotNull();
    assertThat(tree.lpipeToken()).isNull();
    assertThat(tree.properties().size()).isEqualTo(1);
    assertThat(tree.rpipeToken()).isNull();
    assertThat(tree.rcurlyToken()).isNotNull();
  }

}
