/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.sonar.javascript.parser.JavaScriptLegacyGrammar;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class AssignmentExpressionTest {


  @Test
  public void ok() {
    assertThat(JavaScriptLegacyGrammar.ASSIGNMENT_EXPRESSION)
      .matches("conditionalExpression")
      .matches("yield")
      .matches("leftHandSideExpression **= conditionalExpression")
      .matches("leftHandSideExpression = conditionalExpression")
      .matches("leftHandSideExpression = leftHandSideExpression = conditionalExpression");
  }

  @Test
  public void realLife() {
    assertThat(JavaScriptLegacyGrammar.ASSIGNMENT_EXPRESSION)
      .matches("this.first = first");
  }

  @Test
  public void array_assignment_pattern() {
    assertThat(JavaScriptLegacyGrammar.ASSIGNMENT_EXPRESSION)
      .matches("[x, y] = arr")
      .matches("[x.foo, y] = arr")
      .matches("[x, y[42]] = arr")
      .matches("[, x, , y] = arr")
      .matches("[x, y][z] = foo")
    ;
  }

  @Test
  public void object_assignment_pattern() {
    assertThat(JavaScriptLegacyGrammar.ASSIGNMENT_EXPRESSION)
      .matches("{x, y} = obj")
      .matches("{x, y:y[42]} = obj")
      .matches("{x:foo.x, y} = obj")
      .matches("{x, y, ...restProp} = obj")
    ;
  }

}
