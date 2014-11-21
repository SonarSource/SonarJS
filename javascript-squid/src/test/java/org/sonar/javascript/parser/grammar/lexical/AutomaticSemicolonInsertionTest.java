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
package org.sonar.javascript.parser.grammar.lexical;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptGrammar;

import static org.sonar.javascript.sslr.tests.Assertions.assertThat;

public class AutomaticSemicolonInsertionTest {


  /**
   * http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.2
   */
  @Test
  public void test() {
    assertThat(EcmaScriptGrammar.SCRIPT)
        .as("not valid").notMatches("{ 1 2 } 3")
        .as("transformed to valid").matches("{ 1 \n 2 } 3");

    assertThat(EcmaScriptGrammar.FOR_STATEMENT)
        .as("not valid and not transformed").notMatches("for (a; b \n ) ;")
        .as("valid").matches("for (a; b ; \n ) ;");

    assertThat(EcmaScriptGrammar.RETURN_STATEMENT)
        .matchesPrefix("return \n", "a + b");

    assertThat(EcmaScriptGrammar.EXPRESSION_STATEMENT)
        .matchesPrefix("a = b \n", "++c");

    assertThat(EcmaScriptGrammar.IF_STATEMENT)
        .as("not valid and not transformed").notMatches("if (a > b) \n else c = d")
        .as("valid").matches("if (a > b) ; \n else c = d");

    assertThat(EcmaScriptGrammar.EXPRESSION_STATEMENT)
        .as("not transformed").matches("a = b + c \n (d + e).print()");
  }

}
