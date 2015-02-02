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

import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.implementations.declaration.ObjectBindingPatternTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.ObjectBindingPatternTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

import java.util.List;

public class ObjectBindingPatternTreeModelTest extends JavaScriptTreeModelTest {


  @Test
  public void test() throws Exception {
    ObjectBindingPatternTree tree = parse("var { a, b = 1, c : z, } = obj", Kind.OBJECT_BINDING_PATTERN);

    assertThat(tree.is(Kind.OBJECT_BINDING_PATTERN)).isTrue();
    assertThat(tree.openCurlyBrace().text()).isEqualTo("{");

    assertThat(tree.elements().size()).isEqualTo(3);
    assertThat(tree.elements().getSeparators().size()).isEqualTo(3);

    assertThat(tree.elements().get(0).is(Kind.BINDING_IDENTIFIER)).isTrue();
    assertThat(tree.elements().get(1).is(Kind.INITIALIZED_BINDING_ELEMENT)).isTrue();
    assertThat(tree.elements().get(2).is(Kind.BINDING_PROPERTY)).isTrue();

    assertThat(tree.closeCurlyBrace().text()).isEqualTo("}");
  }

  @Test
  public void bindingIdentifiers() throws Exception {
    ObjectBindingPatternTreeImpl tree = parse("var { a, b = 1, c : z, d : { x, y } } = obj", Kind.OBJECT_BINDING_PATTERN);

    List<IdentifierTree> bindingName = tree.bindingIdentifiers();
    assertThat(bindingName).hasSize(5);
    assertThat(bindingName.get(0).name()).isEqualTo("a");
    assertThat(bindingName.get(1).name()).isEqualTo("b");
    assertThat(bindingName.get(2).name()).isEqualTo("z");
    assertThat(bindingName.get(3).name()).isEqualTo("x");
    assertThat(bindingName.get(4).name()).isEqualTo("y");
  }

}
