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
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;

import static org.fest.assertions.Assertions.assertThat;

public class LiteralTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void null_literal() throws Exception {
    LiteralTree tree = parse("null;", Kind.NULL_LITERAL);

    assertThat(tree.is(Kind.NULL_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo(EcmaScriptKeyword.NULL.getValue());
  }

  @Test
  public void boolean_true_literal() throws Exception {
    LiteralTree tree = parse("true;", Kind.BOOLEAN_LITERAL);

    assertThat(tree.is(Kind.BOOLEAN_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo(EcmaScriptKeyword.TRUE.getValue());
  }

  @Test
  public void boolean_false_literal() throws Exception {
    LiteralTree tree = parse("false;", Kind.BOOLEAN_LITERAL);

    assertThat(tree.is(Kind.BOOLEAN_LITERAL)).isTrue();
    assertThat(tree.value()).isEqualTo(EcmaScriptKeyword.FALSE.getValue());
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
