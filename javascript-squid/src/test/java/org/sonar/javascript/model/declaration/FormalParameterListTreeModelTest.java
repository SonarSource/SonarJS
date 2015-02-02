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
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;

public class FormalParameterListTreeModelTest extends JavaScriptTreeModelTest {


  @Test
  public void parameters() throws Exception {
    ParameterListTree tree = parse("function f(p1, p2, ...p3) {};", Kind.FORMAL_PARAMETER_LIST);

    assertThat(tree.is(Kind.FORMAL_PARAMETER_LIST)).isTrue();
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
    ParameterListTree tree = parse("function f() {};", Kind.FORMAL_PARAMETER_LIST);

    assertThat(tree.is(Kind.FORMAL_PARAMETER_LIST)).isTrue();
    assertThat(tree.openParenthesis().text()).isEqualTo("(");

    assertThat(tree.parameters().size()).isEqualTo(0);
    assertThat(tree.parameters().getSeparators().size()).isEqualTo(0);

    assertThat(tree.closeParenthesis().text()).isEqualTo(")");
  }

}
