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
package org.sonar.javascript.parser.expressions;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class ClassElementTest {


  @Test
  public void ok() {
    assertThat(EcmaScriptLexer.CLASS_ELEMENT)
      .matches("static f() {}")
      .matches("f () {}")
      .matches(";")
      .matches(",")
    ;
  }

  @Test
  public void properties() throws Exception {
    assertThat(EcmaScriptLexer.CLASS_ELEMENT)
      // identifier
      .matches("property ;")
      // number literal
      .matches("1 ;")
      // string literal
      .matches("'prop_name' ;")
      // computed property
      .matches("[21 + 21] ;")

      .matches("property = 1 ;")
      .matches("property = foo() ;")
      .matches("property = notProperty = 0 ;")
      .matches("property = () => {} ;")

      .matches("static property ;")
      .matches("static property = 1 ;")
      .matches("property = 1")

      .notMatches("property =;")
      .notMatches("static;")

      .matches("'foo': boolean = true;")
    ;
  }
}
