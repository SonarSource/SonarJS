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
package org.sonar.javascript.tree.impl.expression;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ConditionalExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    ConditionalExpressionTree tree = parse("condition ? a : b;", Kind.CONDITIONAL_EXPRESSION);

    assertThat(tree.is(Kind.CONDITIONAL_EXPRESSION)).isTrue();
    assertThat(expressionToString(tree.condition())).isEqualTo("condition");
    assertThat(expressionToString(tree.trueExpression())).isEqualTo("a");
    assertThat(expressionToString(tree.falseExpression())).isEqualTo("b");
  }

  @Test
  public void arrow_function_operand() throws Exception {
    ConditionalExpressionTree tree = parse("condition ? a : b => b;", Kind.CONDITIONAL_EXPRESSION);

    assertThat(tree.is(Kind.CONDITIONAL_EXPRESSION)).isTrue();
    assertThat(expressionToString(tree.trueExpression())).isEqualTo("a");
    assertThat(expressionToString(tree.falseExpression())).isEqualTo("b => b");
  }

}
