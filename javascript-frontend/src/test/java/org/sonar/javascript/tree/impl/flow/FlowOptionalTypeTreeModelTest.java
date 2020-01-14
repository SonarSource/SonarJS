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
import org.sonar.plugins.javascript.api.tree.flow.FlowOptionalTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimpleTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowOptionalTypeTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowOptionalTypeTree tree = parse("?Foo", Kind.FLOW_OPTIONAL_TYPE, Kind.FLOW_OPTIONAL_TYPE);

    assertThat(tree.is(Kind.FLOW_OPTIONAL_TYPE)).isTrue();
    assertThat(tree.questionToken().text()).isEqualTo("?");
    assertThat(tree.type().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();
    assertThat(((FlowSimpleTypeTree) tree.type()).token().text()).isEqualTo("Foo");
  }

  @Test
  public void not_confuse_with_conditional() throws Exception {
    ExpressionStatementTree conditional = parse("x? 1 : 2", Kind.EXPRESSION_STATEMENT);
    assertThat(conditional.expression().is(Kind.CONDITIONAL_EXPRESSION)).isTrue();


    FlowTypedBindingElementTree bindingElementTree = parse("var x: ?Foo", Kind.FLOW_TYPED_BINDING_ELEMENT);
    assertThat(bindingElementTree.typeAnnotation().type().is(Kind.FLOW_OPTIONAL_TYPE)).isTrue();
    assertThat(bindingElementTree.bindingElement().is(Kind.BINDING_IDENTIFIER)).isTrue();
  }

}
