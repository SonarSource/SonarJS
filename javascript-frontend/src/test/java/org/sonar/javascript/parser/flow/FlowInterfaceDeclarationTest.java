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
package org.sonar.javascript.parser.flow;

import org.junit.Test;
import org.sonar.javascript.utils.LegacyParserTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.sslr.tests.Assertions.assertThat;

public class FlowInterfaceDeclarationTest extends LegacyParserTest {

  @Test
  public void test() {
    assertThat(g.rule(Kind.FLOW_INTERFACE_DECLARATION))
      .matches("interface A {}")
      .matches("interface A {a: number, b: string}")
      .matches("interface A {a: number; b: string;}")
      .matches("interface A {a: number}")
      .matches("interface A <T> extends B<Type>, C.D, E.F<Type> {a: number}")
    ;
  }

}
