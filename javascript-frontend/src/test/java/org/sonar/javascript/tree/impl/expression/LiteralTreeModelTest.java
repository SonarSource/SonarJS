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
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

import static org.assertj.core.api.Assertions.assertThat;

public class LiteralTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void null_literal() throws Exception {
    LiteralTree tree = parse("null;", Kind.NULL_LITERAL);

    assertThat(tree.is(Kind.NULL_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo(JavaScriptKeyword.NULL.getValue());
  }

  @Test
  public void boolean_true_literal() throws Exception {
    LiteralTree tree = parse("true;", Kind.BOOLEAN_LITERAL);

    assertThat(tree.is(Kind.BOOLEAN_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo(JavaScriptKeyword.TRUE.getValue());
  }

  @Test
  public void boolean_false_literal() throws Exception {
    LiteralTree tree = parse("false;", Kind.BOOLEAN_LITERAL);

    assertThat(tree.is(Kind.BOOLEAN_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo(JavaScriptKeyword.FALSE.getValue());
  }

  @Test
  public void numeric_literal() throws Exception {
    LiteralTree tree = parse("0;", Kind.NUMERIC_LITERAL);

    assertThat(tree.is(Kind.NUMERIC_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo("0");
  }

  @Test
  public void string_literal() throws Exception {
    LiteralTree tree = parse("\"str\";", Kind.STRING_LITERAL);

    assertThat(tree.is(Kind.STRING_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo("\"str\"");
  }

  @Test
  public void regexp_literal() throws Exception {
    LiteralTree tree = parse("/pattern/modifiers;", Kind.REGULAR_EXPRESSION_LITERAL);

    assertThat(tree.is(Kind.REGULAR_EXPRESSION_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo("/pattern/modifiers");
  }

}
