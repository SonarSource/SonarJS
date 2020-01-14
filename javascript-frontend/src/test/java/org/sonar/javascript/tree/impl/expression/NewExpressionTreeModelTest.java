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
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class NewExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void new_super_with_arguments() throws Exception {
    NewExpressionTree tree = parse("new super ()", Kind.NEW_SUPER);

    assertThat(tree.is(Kind.NEW_SUPER)).isTrue();
    assertThat(tree.newKeyword().text()).isEqualTo(JavaScriptKeyword.NEW.getValue());
    assertThat(tree.expression().is(Kind.SUPER)).isTrue();
    assertThat(tree.argumentClause()).isNotNull();
  }

  @Test
  public void new_super_without_arguments() throws Exception {
    NewExpressionTree tree = parse("new super", Kind.NEW_SUPER);

    assertThat(tree.is(Kind.NEW_SUPER)).isTrue();
    assertThat(tree.newKeyword().text()).isEqualTo(JavaScriptKeyword.NEW.getValue());
    assertThat(tree.expression().is(Kind.SUPER)).isTrue();
    assertThat(tree.argumentClause()).isNull();
  }

  @Test
  public void new_expression_with_arguments() throws Exception {
    NewExpressionTree tree = parse("new Name ()", Kind.NEW_EXPRESSION);

    assertThat(tree.is(Kind.NEW_EXPRESSION)).isTrue();
    assertThat(tree.newKeyword().text()).isEqualTo(JavaScriptKeyword.NEW.getValue());
    assertThat(tree.expression().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
    assertThat(tree.argumentClause()).isNotNull();
  }

  @Test
  public void new_expression_without_arguments() throws Exception {
    NewExpressionTree tree = parse("new Name", Kind.NEW_EXPRESSION);

    assertThat(tree.is(Kind.NEW_EXPRESSION)).isTrue();
    assertThat(tree.newKeyword().text()).isEqualTo(JavaScriptKeyword.NEW.getValue());
    assertThat(tree.expression().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
    assertThat(tree.argumentClause()).isNull();
  }

  @Test
  public void nested_new_expression_without_arguments() throws Exception {
    NewExpressionTree tree = parse("new new Name", Kind.NEW_EXPRESSION);

    assertThat(tree.is(Kind.NEW_EXPRESSION)).isTrue();
    assertThat(tree.newKeyword().text()).isEqualTo(JavaScriptKeyword.NEW.getValue());
    assertThat(tree.expression().is(Kind.NEW_EXPRESSION)).isTrue();
    assertThat(tree.argumentClause()).isNull();

    tree = (NewExpressionTree) tree.expression();

    assertThat(tree.is(Kind.NEW_EXPRESSION)).isTrue();
    assertThat(tree.newKeyword().text()).isEqualTo(JavaScriptKeyword.NEW.getValue());
    assertThat(tree.expression().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
    assertThat(tree.argumentClause()).isNull();
  }

}
