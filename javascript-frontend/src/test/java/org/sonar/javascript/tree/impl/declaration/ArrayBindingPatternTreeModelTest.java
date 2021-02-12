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
package org.sonar.javascript.tree.impl.declaration;

import java.util.Iterator;
import java.util.List;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ArrayBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.assertj.core.api.Assertions.assertThat;

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
    ArrayBindingPatternTreeImpl tree = parse("var [a, , b = 1, { d }, [ i ], ...c] = obj", Kind.ARRAY_BINDING_PATTERN);

    List<IdentifierTree> bindingName = tree.bindingIdentifiers();
    assertThat(bindingName).hasSize(5);
    assertThat(bindingName.get(0).name()).isEqualTo("a");
    assertThat(bindingName.get(1).name()).isEqualTo("b");
    assertThat(bindingName.get(2).name()).isEqualTo("d");
    assertThat(bindingName.get(3).name()).isEqualTo("i");
    assertThat(bindingName.get(4).name()).isEqualTo("c");
  }

  @Test
  public void childrenIterator() throws Exception {
    ArrayBindingPatternTreeImpl tree1 = parse("var [ ] = obj", Kind.ARRAY_BINDING_PATTERN);
    ArrayBindingPatternTreeImpl tree2 = parse("var [a, , b, { d }, [ i ], ...c] = obj", Kind.ARRAY_BINDING_PATTERN);

    Iterator<Tree> treeIterator1 = tree1.childrenIterator();
    assertThat(size(treeIterator1)).isEqualTo(2);

    Iterator<Tree> treeIterator2 = tree2.childrenIterator();
    assertThat(size(treeIterator2)).isEqualTo(13);
  }

  private int size(Iterator<Tree> iterator) {
    int result = 0;
    while (iterator.hasNext()) {
      iterator.next();
      result++;
    }
    return result;
  }

}
