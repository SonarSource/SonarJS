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
package org.sonar.javascript.tree.impl.expression;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ArrayLiteralTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void empty() throws Exception {
    ArrayLiteralTree tree = parse("[ ];", Kind.ARRAY_LITERAL);

    assertThat(tree.is(Kind.ARRAY_LITERAL)).isTrue();
    assertThat(tree.openBracketToken().text()).isEqualTo("[");

    assertThat(tree.elements().isEmpty()).isTrue();
    assertThat(tree.elementsAndCommas().isEmpty()).isTrue();

    assertThat(tree.closeBracketToken().text()).isEqualTo("]");
  }

  @Test
  public void with_trailing_comma_at_the_end() throws Exception {
    ArrayLiteralTree tree = parse("[ a, a , ];", Kind.ARRAY_LITERAL);

    assertThat(tree.openBracketToken().text()).isEqualTo("[");

    assertThat(tree.elements().size()).isEqualTo(2);
    assertThat(expressionToString(tree.elements().get(0))).isEqualTo("a");
    assertThat(expressionToString(tree.elements().get(1))).isEqualTo("a");
    assertThat(tree.elementsAndCommas().size()).isEqualTo(4);

    assertThat(tree.closeBracketToken().text()).isEqualTo("]");

  }

  @Test
  public void with_elided_elements_at_the_end() throws Exception {
    // One elided element
    ArrayLiteralTree tree1 = parse("[ ,a, , ];", Kind.ARRAY_LITERAL);

    assertThat(tree1.openBracketToken().text()).isEqualTo("[");

    assertThat(tree1.elements().size()).isEqualTo(1);
    assertThat(expressionToString(tree1.elements().get(0))).isEqualTo("a");
    assertThat(tree1.elementsAndCommas().size()).isEqualTo(4);

    assertThat(tree1.closeBracketToken().text()).isEqualTo("]");

    // Two elided element
    ArrayLiteralTree tree2 = parse("[ ,a, , ,];", Kind.ARRAY_LITERAL);

    assertThat(tree1.openBracketToken().text()).isEqualTo("[");

    assertThat(tree2.elements().size()).isEqualTo(1);
    assertThat(expressionToString(tree1.elements().get(0))).isEqualTo("a");
    assertThat(tree2.elementsAndCommas().size()).isEqualTo(5);

    assertThat(tree1.closeBracketToken().text()).isEqualTo("]");
  }

  @Test
  public void with_elided_elements_in_the_middle() throws Exception {
    // One elided element
    ArrayLiteralTree tree1 = parse("[ a, ,a ];", Kind.ARRAY_LITERAL);

    assertThat(tree1.openBracketToken().text()).isEqualTo("[");

    assertThat(tree1.elements().size()).isEqualTo(2);
    assertThat(expressionToString(tree1.elements().get(0))).isEqualTo("a");
    assertThat(expressionToString(tree1.elements().get(1))).isEqualTo("a");
    assertThat(tree1.elementsAndCommas().size()).isEqualTo(4);

    assertThat(tree1.closeBracketToken().text()).isEqualTo("]");

    // One elided element
    ArrayLiteralTree tree2 = parse("[ a, , ,a ];", Kind.ARRAY_LITERAL);

    assertThat(tree1.openBracketToken().text()).isEqualTo("[");

    assertThat(tree2.elements().size()).isEqualTo(2);
    assertThat(expressionToString(tree2.elements().get(0))).isEqualTo("a");
    assertThat(expressionToString(tree2.elements().get(1))).isEqualTo("a");
    assertThat(tree2.elementsAndCommas().size()).isEqualTo(5);

    assertThat(tree2.closeBracketToken().text()).isEqualTo("]");
  }

}
