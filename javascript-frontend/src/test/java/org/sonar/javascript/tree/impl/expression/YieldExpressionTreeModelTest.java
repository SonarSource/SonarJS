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

import org.junit.Ignore;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;

import static org.fest.assertions.Assertions.assertThat;

public class YieldExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Ignore
  @Test
  public void without_argument_star() throws Exception {
    YieldExpressionTree tree = parse("yield;", Kind.YIELD_EXPRESSION);

    assertThat(tree.is(Kind.YIELD_EXPRESSION)).isTrue();
    assertThat(tree.yieldKeyword().text()).isEqualTo("yield");
    assertThat(tree.star()).isNull();
    assertThat(tree.argument()).isNull();
  }

  @Ignore
  @Test
  public void with_star() throws Exception {
    YieldExpressionTree tree = parse("yield * expression;", Kind.YIELD_EXPRESSION);

    assertThat(tree.is(Kind.YIELD_EXPRESSION)).isTrue();
    assertThat(tree.yieldKeyword().text()).isEqualTo("yield");
    assertThat(tree.star().text()).isEqualTo("*");
    assertThat(expressionToString(tree.argument())).isEqualTo("expression");
  }

  @Ignore
  @Test
  public void without_star() throws Exception {
    YieldExpressionTree tree = parse("yield expression;", Kind.YIELD_EXPRESSION);

    assertThat(tree.is(Kind.YIELD_EXPRESSION)).isTrue();
    assertThat(tree.yieldKeyword().text()).isEqualTo("yield");
    assertThat(tree.star()).isNull();
    assertThat(expressionToString(tree.argument())).isEqualTo("expression");
  }

}
