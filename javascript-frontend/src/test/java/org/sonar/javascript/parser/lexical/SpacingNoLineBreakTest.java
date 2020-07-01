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
package org.sonar.javascript.parser.lexical;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;
import org.sonar.javascript.utils.LegacyParserTest;

import static org.sonar.sslr.tests.Assertions.assertThat;

public class SpacingNoLineBreakTest extends LegacyParserTest {

  @Test
  public void ok() {
    assertThat(g.rule(EcmaScriptLexer.SPACING_NO_LB))
      .matches("")

      .as("Whitespace")
      .matches(" ")
      .notMatches("\n")
      .notMatches("\r")
      .notMatches("\r\n")

      .as("SingleLineComment")
      .matchesPrefix("// comment", "\n")

      .as("MultiLineComment no line break")
      .matches("/* comment */")
      .notMatches("/* comment \n */");
  }

}
