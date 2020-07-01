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
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ClassExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void with_name() throws Exception {
    ClassTree tree = parse("var c = class C { }", Kind.CLASS_EXPRESSION);

    assertThat(tree.is(Kind.CLASS_EXPRESSION)).isTrue();
    assertThat(tree.classToken().text()).isEqualTo("class");
    assertThat(tree.name().name()).isEqualTo("C");
    assertThat(tree.extendsClause()).isNull();
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");
    // TODO members
    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void without_name() throws Exception {
    ClassTree tree = parse("var c = class { }", Kind.CLASS_EXPRESSION);

    assertThat(tree.is(Kind.CLASS_EXPRESSION)).isTrue();
    assertThat(tree.classToken().text()).isEqualTo(JavaScriptKeyword.CLASS.getValue());
    assertThat(tree.name()).isNull();
    assertThat(tree.extendsClause()).isNull();
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");
    // TODO members
    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void extends_clause() throws Exception {
    ClassTree tree = parse("var c = class extends S { }", Kind.CLASS_EXPRESSION);

    assertThat(tree.extendsClause().extendsToken().text()).isEqualTo("extends");
    assertThat(tree.extendsClause().superClass()).isNotNull();
  }

  @Test
  public void flow() throws Exception {
    ClassTree tree = parse("var c = class <T> { }", Kind.CLASS_EXPRESSION);

    assertThat(tree.genericParameterClause()).isNotNull();
  }

}
