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
package org.sonar.javascript.parser.declarations.module;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class ImportDeclarationTest {

  @Test
  public void ok() {
    assertThat(EcmaScriptLexer.IMPORT_DECLARATION)
      .matches("import identifier from \"f\";")
      .matches("import \"f\";");
  }

  @Test
  public void flow() {
    assertThat(EcmaScriptLexer.IMPORT_DECLARATION)
      .matches("import type MyClass from \"f\";")
      .matches("import type {a, b} from \"f\";")
      .matches("import typeof {a, b} from \"f\";")
      .matches("import {type a, typeof b, type A as aa, typeof B as bb} from \"f\";")
      .matches("import typeof MyClass from \"f\";")
    ;
  }

  @Test
  public void not_flow() {
    assertThat(EcmaScriptLexer.IMPORT_DECLARATION)
      .matches("import type from \"f\";")
      .matches("import { type } from \"f\";")
      .matches("import { type as T } from \"f\";")
    ;
  }

}
