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
package org.sonar.javascript.parser.expressions;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class ArrowFunctionTest {


  @Test
  public void ok() {
    assertThat(Kind.ARROW_FUNCTION)
      .matches("identifier => conditionalExpression")
      .matches("identifier => { }")
      .matches("() => { }")
    ;
  }

  @Test
  public void async_function() throws Exception {
    assertThat(Kind.ARROW_FUNCTION)
      .matches("async () => { }")
      .matches("async a => foo(a)")
    ;

  }

  @Test
  public void async_function_from_script() throws Exception {
    assertThat(EcmaScriptLexer.SCRIPT)
      .matches("var bar = async x => foo()")
    ;
  }

  @Test
  public void flow() throws Exception {
    assertThat(Kind.ARROW_FUNCTION)
      .matches("<T>(x): void => {}")
    ;
  }
}
