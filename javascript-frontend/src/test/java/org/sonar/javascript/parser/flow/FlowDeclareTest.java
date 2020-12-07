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
package org.sonar.javascript.parser.flow;

import org.junit.Test;
import org.sonar.javascript.utils.LegacyParserTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.sslr.tests.Assertions.assertThat;

public class FlowDeclareTest extends LegacyParserTest {

  @Test
  public void test() {
    assertThat(g.rule(Kind.FLOW_DECLARE))
      .matches("declare export function foo(){}")
      .matches("declare function foo(): void;")
      .matches("declare export default function foo(): void;")
      .matches("declare function foo(number): string;")
      .matches("declare var x : number")
      .matches("declare const x = 42")
      .matches("declare const x = 42")
      .matches("declare export var a: number;")
      .matches("declare module 'A' {}")
      .matches("declare export default class MyClass {}")
      .matches("declare type MyAlias = number")
      .matches("declare opaque type MyAlias")
      .matches("declare export type MyAlias = number")
      .matches("declare interface I {}")
      .matches("declare module.exports: MyType;")
      .matches("declare class A { a: foo , b: bar}")
    ;
  }

}
