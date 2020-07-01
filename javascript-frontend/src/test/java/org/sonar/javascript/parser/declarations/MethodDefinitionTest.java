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
package org.sonar.javascript.parser.declarations;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class MethodDefinitionTest {


  @Test
  public void ok() {
    assertThat(EcmaScriptLexer.METHOD_DEFINITION)
      .matches("f() {}")
      .matches("@decorator f() {}")
      .matches("@decorator @decorator f() {}")

      .matches("static f() {}")
      .matches("@decorator static f() {}")
      .matches("@decorator @decorator static f() {}")

      .matches("set f(p) {}")
      .matches("get f() {}")
      .matches("@decorator set f(p) {}")
      .matches("@decorator @decorator get f() {}")

      .matches("* f() {}")
      .matches("@decorator * f() {}")
      .matches("@decorator @decorator * f() {}")
    ;
  }

  @Test
  public void async_method() {
    assertThat(EcmaScriptLexer.METHOD_DEFINITION)
      .matches("async f() {}")
      .matches("static async f() {}")
    ;
  }

}
