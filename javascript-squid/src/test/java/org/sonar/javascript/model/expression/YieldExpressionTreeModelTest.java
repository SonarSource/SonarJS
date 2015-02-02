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
package org.sonar.javascript.model.expression;

import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.YieldExpressionTree;

import static org.fest.assertions.Assertions.assertThat;

public class YieldExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_argument_star() throws Exception {
    YieldExpressionTree tree = parse("yield;", Kind.YIELD_EXPRESSION);

    assertThat(tree.is(Kind.YIELD_EXPRESSION)).isTrue();
    assertThat(tree.yieldKeyword().text()).isEqualTo("yield");
    assertThat(tree.star()).isNull();
    assertThat(tree.argument()).isNull();
  }

  @Test
  public void with_star() throws Exception {
    YieldExpressionTree tree = parse("yield * expression;", Kind.YIELD_EXPRESSION);

    assertThat(tree.is(Kind.YIELD_EXPRESSION)).isTrue();
    assertThat(tree.yieldKeyword().text()).isEqualTo("yield");
    assertThat(tree.star().text()).isEqualTo("*");
    assertThat(expressionToString(tree.argument())).isEqualTo("expression");
  }

  @Test
  public void without_star() throws Exception {
    YieldExpressionTree tree = parse("yield expression;", Kind.YIELD_EXPRESSION);

    assertThat(tree.is(Kind.YIELD_EXPRESSION)).isTrue();
    assertThat(tree.yieldKeyword().text()).isEqualTo("yield");
    assertThat(tree.star()).isNull();
    assertThat(expressionToString(tree.argument())).isEqualTo("expression");
  }

}
