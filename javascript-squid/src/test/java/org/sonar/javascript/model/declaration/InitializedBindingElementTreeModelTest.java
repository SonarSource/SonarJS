/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.model.declaration;

import static org.fest.assertions.Assertions.assertThat;

import java.util.List;

import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.implementations.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.InitializedBindingElementTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

public class InitializedBindingElementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test_identifier() throws Exception {
    InitializedBindingElementTree tree = parse("var a = 1", Kind.INITIALIZED_BINDING_ELEMENT);

    assertThat(tree.is(Kind.INITIALIZED_BINDING_ELEMENT)).isTrue();
    assertThat(expressionToString(tree.left())).isEqualTo("a");
    assertThat(tree.equalToken().text()).isEqualTo("=");
    assertThat(expressionToString(tree.right())).isEqualTo("1");
  }

  @Test
  public void test_binding_pattern() throws Exception {
    InitializedBindingElementTree tree = parse("var { a : x } = 1", Kind.INITIALIZED_BINDING_ELEMENT);

    assertThat(tree.is(Kind.INITIALIZED_BINDING_ELEMENT)).isTrue();
    assertThat(expressionToString(tree.left())).isEqualTo("{ a : x }");
    assertThat(tree.equalToken().text()).isEqualTo("=");
    assertThat(expressionToString(tree.right())).isEqualTo("1");
  }

  @Test
  public void bindingIdentifiers() throws Exception {
    // Identifier
    InitializedBindingElementTreeImpl tree = parse("var a = obj", Kind.INITIALIZED_BINDING_ELEMENT);

    List<IdentifierTree> bindingName = tree.bindingIdentifiers();
    assertThat(bindingName).hasSize(1);
    assertThat(bindingName.get(0).name()).isEqualTo("a");

    // Binding pattern
    tree = parse("var { a : x } = obj", Kind.INITIALIZED_BINDING_ELEMENT);

    bindingName = tree.bindingIdentifiers();
    assertThat(bindingName).hasSize(1);
    assertThat(bindingName.get(0).name()).isEqualTo("x");
  }

}
