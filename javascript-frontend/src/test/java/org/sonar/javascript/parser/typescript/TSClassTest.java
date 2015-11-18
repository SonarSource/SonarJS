/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.parser.typescript;

import org.junit.Test;
import org.sonar.javascript.utils.LegacyParserTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class TSClassTest extends LegacyParserTest {

  @Test
  public void class_declaration() {
    assertThat(g.rule(Kind.CLASS_DECLARATION))
      .matches("class C <T> extends A implements I {}")
      .matches("class C implements I1, I2 {}")
      .matches("class <T> {}");
  }

  @Test
  public void class_expression() {
    assertThat(g.rule(Kind.CLASS_EXPRESSION))
      .matches("class C <T> extends A implements I {}")
      .matches("class C implements I1, I2 {}")
      .matches("class <T> {}");
  }
}
