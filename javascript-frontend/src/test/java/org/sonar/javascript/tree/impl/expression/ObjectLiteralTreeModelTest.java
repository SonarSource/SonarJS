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
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ObjectLiteralTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void with_properties() throws Exception {
    ObjectLiteralTree tree = parse("var a = { key : value , method ( ) { } , ... spreadObject, identifier , }", Kind.OBJECT_LITERAL);

    assertThat(tree.is(Kind.OBJECT_LITERAL)).isTrue();
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");

    assertThat(tree.properties()).hasSize(4);
    assertThat(expressionToString(tree.properties().get(0))).isEqualTo("key : value");
    assertThat(expressionToString(tree.properties().get(1))).isEqualTo("method ( ) { }");

    assertThat(expressionToString(tree.properties().get(2))).isEqualTo("... spreadObject");
    assertThat(tree.properties().get(2).is(Kind.SPREAD_ELEMENT)).isTrue();

    assertThat(expressionToString(tree.properties().get(3))).isEqualTo("identifier");

    assertThat(tree.properties().getSeparators()).hasSize(4);

    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void without_property() throws Exception {
    ObjectLiteralTree tree = parse("var a = { }", Kind.OBJECT_LITERAL);

    assertThat(tree.is(Kind.OBJECT_LITERAL)).isTrue();
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");

    assertThat(tree.properties()).hasSize(0);
    assertThat(tree.properties().getSeparators()).hasSize(0);

    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

}
