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
package org.sonar.javascript.tree.impl.declaration;

import java.util.List;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ObjectBindingPatternTreeModelTest extends JavaScriptTreeModelTest {


  @Test
  public void test() throws Exception {
    ObjectBindingPatternTree tree = parse("var { a, b = 1, c : z, } = obj", Kind.OBJECT_BINDING_PATTERN);

    assertThat(tree.is(Kind.OBJECT_BINDING_PATTERN)).isTrue();
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");

    assertThat(tree.elements().size()).isEqualTo(3);
    assertThat(tree.elements().getSeparators().size()).isEqualTo(3);

    assertThat(tree.elements().get(0).is(Kind.BINDING_IDENTIFIER)).isTrue();
    assertThat(tree.elements().get(1).is(Kind.INITIALIZED_BINDING_ELEMENT)).isTrue();
    assertThat(tree.elements().get(2).is(Kind.BINDING_PROPERTY)).isTrue();

    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void bindingIdentifiers() throws Exception {
    ObjectBindingPatternTreeImpl tree = parse("var { a, b = 1, c : z, d : { x, y }, g: h = 1, m : [k, l], ...f} = obj", Kind.OBJECT_BINDING_PATTERN);

    List<IdentifierTree> bindingName = tree.bindingIdentifiers();
    assertThat(bindingName).hasSize(9);
    assertThat(bindingName.get(0).name()).isEqualTo("a");
    assertThat(bindingName.get(1).name()).isEqualTo("b");
    assertThat(bindingName.get(2).name()).isEqualTo("z");
    assertThat(bindingName.get(3).name()).isEqualTo("x");
    assertThat(bindingName.get(4).name()).isEqualTo("y");
    assertThat(bindingName.get(5).name()).isEqualTo("h");
    assertThat(bindingName.get(6).name()).isEqualTo("k");
    assertThat(bindingName.get(7).name()).isEqualTo("l");
    assertThat(bindingName.get(8).name()).isEqualTo("f");
  }

}
