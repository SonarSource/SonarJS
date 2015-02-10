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

import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.implementations.declaration.ArrayBindingPatternTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.ArrayBindingPatternTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

import java.util.List;

import static org.fest.assertions.Assertions.assertThat;

public class ArrayBindingPatternTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    ArrayBindingPatternTree tree = parse("var [] = obj", Kind.ARRAY_BINDING_PATTERN);

    assertThat(tree.is(Kind.ARRAY_BINDING_PATTERN)).isTrue();
    assertThat(tree.openBracketToken().text()).isEqualTo("[");
    assertThat(tree.closeBracketToken().text()).isEqualTo("]");
  }

  @Test
  public void elision() throws Exception {
    ArrayBindingPatternTree tree = parse("var [] = obj", Kind.ARRAY_BINDING_PATTERN);
    assertThat(tree.elements()).isEmpty();
    assertThat(tree.elements().getSeparators()).isEmpty();

    tree = parse("var [,] = obj", Kind.ARRAY_BINDING_PATTERN);
    assertThat(tree.elements()).hasSize(1);
    assertThat(tree.elements().get(0).isPresent()).isFalse();
    assertThat(tree.elements().getSeparators()).hasSize(1);

    tree = parse("var [a,] = obj", Kind.ARRAY_BINDING_PATTERN);
    assertThat(tree.elements()).hasSize(1);
    assertThat(tree.elements().get(0).isPresent()).isTrue();
    assertThat(tree.elements().getSeparators()).hasSize(1);

    tree = parse("var [a,b] = obj", Kind.ARRAY_BINDING_PATTERN);
    assertThat(tree.elements()).hasSize(2);
    assertThat(tree.elements().get(0).isPresent()).isTrue();
    assertThat(tree.elements().get(1).isPresent()).isTrue();
    assertThat(tree.elements().getSeparators()).hasSize(1);

    tree = parse("var [a,b,] = obj", Kind.ARRAY_BINDING_PATTERN);
    assertThat(tree.elements()).hasSize(2);
    assertThat(tree.elements().get(0).isPresent()).isTrue();
    assertThat(tree.elements().get(1).isPresent()).isTrue();
    assertThat(tree.elements().getSeparators()).hasSize(2);

    tree = parse("var [,a,b] = obj", Kind.ARRAY_BINDING_PATTERN);
    assertThat(tree.elements()).hasSize(3);
    assertThat(tree.elements().get(0).isPresent()).isFalse();
    assertThat(tree.elements().get(1).isPresent()).isTrue();
    assertThat(tree.elements().get(2).isPresent()).isTrue();
    assertThat(tree.elements().getSeparators()).hasSize(2);

    tree = parse("var [a,,] = obj", Kind.ARRAY_BINDING_PATTERN);
    assertThat(tree.elements()).hasSize(2);
    assertThat(tree.elements().get(0).isPresent()).isTrue();
    assertThat(tree.elements().get(1).isPresent()).isFalse();
    assertThat(tree.elements().getSeparators()).hasSize(2);
  }

  @Test
  public void bindingIdentifiers() throws Exception {
    ArrayBindingPatternTreeImpl tree = parse("var [a, , b, ...c, { d }, [ i ]] = obj", Kind.ARRAY_BINDING_PATTERN);

    List<IdentifierTree> bindingName = tree.bindingIdentifiers();
    assertThat(bindingName).hasSize(5);
    assertThat(bindingName.get(0).name()).isEqualTo("a");
    assertThat(bindingName.get(1).name()).isEqualTo("b");
    assertThat(bindingName.get(2).name()).isEqualTo("c");
    assertThat(bindingName.get(3).name()).isEqualTo("d");
    assertThat(bindingName.get(4).name()).isEqualTo("i");
  }
}
