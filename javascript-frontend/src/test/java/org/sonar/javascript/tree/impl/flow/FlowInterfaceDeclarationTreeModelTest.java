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
import org.sonar.plugins.javascript.api.tree.flow.FlowInterfaceDeclarationTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowInterfaceDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowInterfaceDeclarationTree tree = parse("interface A<T> extends B {a: number, b:string;}", Kind.FLOW_INTERFACE_DECLARATION);

    assertThat(tree.is(Kind.FLOW_INTERFACE_DECLARATION)).isTrue();
    assertThat(tree.interfaceToken().text()).isEqualTo("interface");
    assertThat(tree.name().identifierToken().text()).isEqualTo("A");
    assertThat(tree.extendsClause().types()).hasSize(1);
    assertThat(tree.genericParameterClause().genericParameters()).hasSize(1);
    assertThat(tree.properties()).hasSize(2);
    assertThat(tree.properties().getSeparators()).hasSize(2);
    assertThat(tree.properties().get(0).key().is(Kind.FLOW_SIMPLE_PROPERTY_DEFINITION_KEY)).isTrue();
    assertThat(tree.properties().getSeparator(0).text()).isEqualTo(",");
    assertThat(tree.properties().getSeparator(1).text()).isEqualTo(";");
  }

}
