/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;

import static org.fest.assertions.Assertions.assertThat;

public class ArgumentsTreeModelTest extends JavaScriptTreeModelTest {


  @Test
  public void parameters() throws Exception {
    ParameterListTree tree = parse("f(p1, p2, ... p3)", Kind.ARGUMENTS);

    assertThat(tree.is(Kind.ARGUMENTS)).isTrue();
    assertThat(tree.openParenthesis().text()).isEqualTo("(");

    assertThat(tree.parameters().size()).isEqualTo(3);
    assertThat(expressionToString(tree.parameters().get(0))).isEqualTo("p1");
    assertThat(expressionToString(tree.parameters().get(1))).isEqualTo("p2");
    assertThat(expressionToString(tree.parameters().get(2))).isEqualTo("... p3");

    assertThat(tree.parameters().getSeparators().size()).isEqualTo(2);

    assertThat(tree.closeParenthesis().text()).isEqualTo(")");
  }


  @Test
  public void no_parameter() throws Exception {
    ParameterListTree tree = parse("f()", Kind.ARGUMENTS);

    assertThat(tree.is(Kind.ARGUMENTS)).isTrue();
    assertThat(tree.openParenthesis().text()).isEqualTo("(");

    assertThat(tree.parameters().size()).isEqualTo(0);
    assertThat(tree.parameters().getSeparators().size()).isEqualTo(0);

    assertThat(tree.closeParenthesis().text()).isEqualTo(")");
  }

}
