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
import org.sonar.javascript.parser.EcmaScriptLexer;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypedBindingElementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowTypedBindingElementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    InitializedBindingElementTree tree = parse("{a: aa, b = 42}: mixed = 42", Kind.INITIALIZED_BINDING_ELEMENT, EcmaScriptLexer.BINDING_ELEMENT);

    assertThat(tree.left().is(Kind.FLOW_TYPED_BINDING_ELEMENT)).isTrue();

    FlowTypedBindingElementTree typedElement = (FlowTypedBindingElementTree) tree.left();
    assertThat(typedElement.bindingElement().is(Kind.OBJECT_BINDING_PATTERN)).isTrue();
    assertThat(typedElement.typeAnnotation().type().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();

    ObjectBindingPatternTree objectPattern = (ObjectBindingPatternTree) typedElement.bindingElement();
    assertThat(objectPattern.elements().get(0).is(Kind.BINDING_PROPERTY)).isTrue();
    assertThat(objectPattern.elements().get(1).is(Kind.INITIALIZED_BINDING_ELEMENT)).isTrue();
  }


}
