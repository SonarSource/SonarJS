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

public class ExportDeclarationTest {

  @Test
  public void ok() {
    assertThat(EcmaScriptLexer.EXPORT_DECLARATION)
      // Namespace export
      .matches("export * from \"f\" ;")

      // Named export
      .matches("export { } ;")
      .matches("export var a;")
      .matches("export class C {}")

      .matches("@dec export class C {}")

      // Default export
      .matches("export default function f() {}")
      .matches("export default function * f() {}")
      .matches("export default class C {}")
      .matches("@dec export default class C {}")
      .matches("export default expression ;")
      .matches("export default expression")

      // ES2017 proposal
      .matches("export * as someIdentifier from \"someModule\";")
      .matches("export someIdentifier from \'someModule\';")
      .matches("export someIdentifier from \"someModule\"")
      .matches("export someIdentifier, * as someIdentifier from \"someModule\";")
      .matches("export someIdentifier, * as someIdentifier from \"someModule\"")
      .matches("export someIdentifier, { namedIdentifier } from \"someModule\";")

    ;
  }

  @Test
  public void flow() {
    assertThat(EcmaScriptLexer.EXPORT_DECLARATION)
      // type alias
      .matches("export type A = B")
      .matches("export opaque type A = B")

      // interface
      .matches("export interface I {}")

      // star
      .matches("export type * from \"bar\"")

      .matches("export type { Foo, Bar }")
      .matches("export type { Foo, Bar as Bar2 } from 'myModule'")
    ;
  }


}
