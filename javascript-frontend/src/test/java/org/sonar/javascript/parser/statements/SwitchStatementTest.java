/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class SwitchStatementTest {


  @Test
  public void ok() {
    assertThat(Kind.SWITCH_STATEMENT)
      .matches("switch ( expression ) { }")
      .matches("switch ( expression ) { case expression: break; }")
      .matches("switch ( expression ) { case expression: break; default: break; }")
      .matches("switch ( expression ) { case expression: break; case expression: break; case expression: break; }")
      // while this case is not supported by grammar, but interpreter parses it
      .matches("switch ( expression ) { case expression: break; default : break; default : break; }");
  }

}
