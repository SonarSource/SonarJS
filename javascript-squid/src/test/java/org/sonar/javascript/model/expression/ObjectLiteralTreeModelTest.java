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
import org.sonar.javascript.model.interfaces.expression.ObjectLiteralTree;

import static org.fest.assertions.Assertions.assertThat;

public class ObjectLiteralTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void with_properties() throws Exception {
   ObjectLiteralTree tree = parse("var a = { key : value , method ( ) { } , identifier , }", Kind.OBJECT_LITERAL);

    assertThat(tree.is(Kind.OBJECT_LITERAL)).isTrue();
    assertThat(tree.openCurlyBrace().text()).isEqualTo("{");

    assertThat(tree.properties()).hasSize(3);
    assertThat(expressionToString(tree.properties().get(0))).isEqualTo("key : value");
    assertThat(expressionToString(tree.properties().get(1))).isEqualTo("method ( ) { }");
    assertThat(expressionToString(tree.properties().get(2))).isEqualTo("identifier");

    assertThat(tree.properties().getSeparators()).hasSize(3);

    assertThat(tree.closeCurlyBrace().text()).isEqualTo("}");
  }

  @Test
  public void without_property() throws Exception {
    ObjectLiteralTree tree = parse("var a = { }", Kind.OBJECT_LITERAL);

    assertThat(tree.is(Kind.OBJECT_LITERAL)).isTrue();
    assertThat(tree.openCurlyBrace().text()).isEqualTo("{");

    assertThat(tree.properties()).hasSize(0);
    assertThat(tree.properties().getSeparators()).hasSize(0);

    assertThat(tree.closeCurlyBrace().text()).isEqualTo("}");
  }

}
