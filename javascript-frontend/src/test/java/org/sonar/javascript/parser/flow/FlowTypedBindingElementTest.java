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
import org.sonar.javascript.parser.EcmaScriptLexer;
import org.sonar.javascript.utils.LegacyParserTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.sslr.tests.Assertions.assertThat;

public class FlowTypedBindingElementTest extends LegacyParserTest {

  @Test
  public void from_typed_binding_element() {
    assertThat(g.rule(Kind.FLOW_TYPED_BINDING_ELEMENT))
      .matches("x: number")
      .matches("{a, b}: any")
      .matches("{a: aa, b}: mixed")
    ;
  }

  @Test
  public void from_binding_element() {
    assertThat(g.rule(EcmaScriptLexer.BINDING_ELEMENT))
      .matches("x")
      .matches("x: number")
      .matches("x: number = 1")
      .matches("{a, b}: any = 42")
    ;
  }

}
