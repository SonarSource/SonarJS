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
import org.sonar.plugins.javascript.api.tree.flow.FlowModuleTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowModuleTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowModuleTree tree = parse("declare module 'A' { declare class A{} declare var Foo: number; }", Kind.FLOW_MODULE);

    assertThat(tree.is(Kind.FLOW_MODULE)).isTrue();
    assertThat(tree.moduleToken().text()).isEqualTo("module");
    assertThat(tree.moduleName().text()).isEqualTo("'A'");
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");
    assertThat(tree.elements()).hasSize(2);
    assertThat(tree.elements().get(0).declaredObject().is(Kind.CLASS_DECLARATION)).isTrue();
    assertThat(tree.elements().get(1).declaredObject().is(Kind.VARIABLE_STATEMENT)).isTrue();
    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void empty_with_identifier_name() throws Exception {
    FlowModuleTree tree = parse("module A { }", Kind.FLOW_MODULE, Kind.FLOW_MODULE);

    assertThat(tree.is(Kind.FLOW_MODULE)).isTrue();
    assertThat(tree.moduleToken().text()).isEqualTo("module");
    assertThat(tree.moduleName().text()).isEqualTo("A");
    assertThat(tree.elements()).isEmpty();
  }

}
