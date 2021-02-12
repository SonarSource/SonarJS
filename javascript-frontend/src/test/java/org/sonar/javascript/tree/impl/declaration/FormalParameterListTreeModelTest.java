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

import java.util.List;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FormalParameterListTreeModelTest extends JavaScriptTreeModelTest {


  @Test
  public void parameters() throws Exception {
    ParameterListTree tree = parse("function f(p1, p2, ...p3) {};", Kind.PARAMETER_LIST);

    assertThat(tree.is(Kind.PARAMETER_LIST)).isTrue();
    assertThat(tree.openParenthesisToken().text()).isEqualTo("(");

    assertThat(tree.parameters().size()).isEqualTo(3);
    assertThat(expressionToString(tree.parameters().get(0))).isEqualTo("p1");
    assertThat(expressionToString(tree.parameters().get(1))).isEqualTo("p2");
    assertThat(expressionToString(tree.parameters().get(2))).isEqualTo("...p3");

    assertThat(tree.parameters().getSeparators().size()).isEqualTo(2);
    assertThat(tree.closeParenthesisToken().text()).isEqualTo(")");
  }


  @Test
  public void no_parameter() throws Exception {
    ParameterListTree tree = parse("function f() {};", Kind.PARAMETER_LIST);

    assertThat(tree.is(Kind.PARAMETER_LIST)).isTrue();
    assertThat(tree.openParenthesisToken().text()).isEqualTo("(");

    assertThat(tree.parameters().size()).isEqualTo(0);
    assertThat(tree.parameters().getSeparators().size()).isEqualTo(0);

    assertThat(tree.closeParenthesisToken().text()).isEqualTo(")");
  }

  @Test
  public void parametersIdentifiers() throws Exception {
    ParameterListTree tree = parse("function f(p1, p2 = 0, { name:p3 }, [,,p4], p5: number, ...p6) {};", Kind.PARAMETER_LIST);

    List<IdentifierTree> parameters = ((ParameterListTreeImpl) tree).parameterIdentifiers();
    assertThat(parameters.size()).isEqualTo(6);
    assertThat(parameters.get(0).name()).isEqualTo("p1");
    assertThat(parameters.get(1).name()).isEqualTo("p2");
    assertThat(parameters.get(2).name()).isEqualTo("p3");
    assertThat(parameters.get(3).name()).isEqualTo("p4");
    assertThat(parameters.get(4).name()).isEqualTo("p5");
    assertThat(parameters.get(5).name()).isEqualTo("p6");
  }

  @Test
  public void flow_typed() throws Exception {
    ParameterListTree tree = parse("function f(p1: number, p2, p3?, p4?: number, ...p5?: any) {};", Kind.PARAMETER_LIST);

    assertThat(tree.parameters().size()).isEqualTo(5);
    assertThat(expressionToString(tree.parameters().get(0))).isEqualTo("p1: number");
    assertThat(expressionToString(tree.parameters().get(1))).isEqualTo("p2");
    assertThat(expressionToString(tree.parameters().get(2))).isEqualTo("p3?");
    assertThat(expressionToString(tree.parameters().get(3))).isEqualTo("p4?: number");
    assertThat(expressionToString(tree.parameters().get(4))).isEqualTo("...p5?: any");
  }
}
