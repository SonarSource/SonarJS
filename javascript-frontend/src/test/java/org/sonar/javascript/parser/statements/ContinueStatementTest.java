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
package org.sonar.javascript.parser.statements;

import org.junit.Test;
import org.sonar.javascript.utils.LegacyParserTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class ContinueStatementTest extends LegacyParserTest {

  @Test
  public void ok() {
    assertThat(g.rule(Kind.CONTINUE_STATEMENT))
      .as("EOS is line terminator")
      .matchesPrefix("continue \n", "another-statement ;")
      .matchesPrefix("continue label \n", "another-statement ;")
      .matchesPrefix("continue \n", ";")

      .as("EOS is semicolon")
      .matchesPrefix("continue ;", "another-statement")
      .matchesPrefix("continue label \n ;", "another-statement")

      .as("EOS is before right curly bracket")
      .matchesPrefix("continue ", "}")
      .matchesPrefix("continue label ", "}")

      .as("EOS is end of input")
      .matches("continue ")
      .matches("continue label ");
  }

}
