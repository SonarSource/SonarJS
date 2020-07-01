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
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class CallExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    CallExpressionTree tree = parse("a()();", Kind.CALL_EXPRESSION);

    assertThat(tree.is(Kind.CALL_EXPRESSION)).isTrue();
    assertThat(tree.callee().is(Kind.CALL_EXPRESSION)).isTrue();
    assertThat(tree.argumentClause()).isNotNull();

    tree = (CallExpressionTree) tree.callee();

    assertThat(tree.is(Kind.CALL_EXPRESSION)).isTrue();
    assertThat(tree.callee().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
    assertThat(tree.argumentClause()).isNotNull();
  }

  @Test
  public void import_es_next() throws Exception {
    CallExpressionTree tree = parse("var x = import(`module name`)", Kind.CALL_EXPRESSION);

    assertThat(tree.callee().is(Kind.IMPORT)).isTrue();
  }
}
