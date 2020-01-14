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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class AutomaticSemicolonInsertionTest {

  /**
   * http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.2
   */
  @Test
  public void test() {
    assertThat(EcmaScriptLexer.SCRIPT)
      .as("not valid").notMatches("{ 1 2 } 3")
      .as("transformed to valid").matches("{ 1 \n 2 } 3");

    assertThat(Kind.FOR_STATEMENT)
      .as("not valid and not transformed").notMatches("for (a; b \n ) ;")
      .as("valid").matches("for (a; b ; \n ) ;");

    // Spaces are no longer part of the node
    assertThat(Kind.RETURN_STATEMENT)
      .matchesPrefix("return", " \n a + b");

    assertThat(Kind.EXPRESSION_STATEMENT)
      .matchesPrefix("a = b", " \n ++c");

    assertThat(Kind.IF_STATEMENT)
      .as("not valid and not transformed").notMatches("if (a > b) \n else c = d")
      .as("valid").matches("if (a > b) ; \n else c = d");

    assertThat(Kind.EXPRESSION_STATEMENT)
      .as("not transformed").matches("a = b + c \n (d + e).print()");
  }

}
