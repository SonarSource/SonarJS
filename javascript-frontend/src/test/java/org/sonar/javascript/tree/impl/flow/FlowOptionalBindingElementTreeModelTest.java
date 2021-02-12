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
package org.sonar.javascript.tree.impl.flow;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.flow.FlowOptionalBindingElementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowOptionalBindingElementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowOptionalBindingElementTree tree = parse("var func = (a?: ?String) => 42", Kind.FLOW_OPTIONAL_BINDING_ELEMENT);

    assertThat(tree.is(Kind.FLOW_OPTIONAL_BINDING_ELEMENT)).isTrue();
    assertThat(tree.questionToken().text()).isEqualTo("?");
    assertThat(tree.bindingElement().is(Kind.BINDING_IDENTIFIER)).isTrue();
    assertThat(tree.bindingIdentifiers()).hasSize(1);
    assertThat(tree.bindingIdentifiers().get(0).name()).isEqualTo("a");
  }

}
