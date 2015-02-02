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
package org.sonar.javascript.parser.grammar.declarations.module;

import org.junit.Test;
import org.sonar.javascript.model.interfaces.Tree;

import static org.sonar.javascript.sslr.tests.Assertions.assertThat;

public class ExportListTest {


  @Test
  public void ok() {
    assertThat(Tree.Kind.EXPORT_LIST)
      .matches("{ }")
      .matches("{ identifier }")
      .matches("{ ident1fier , identifier }")
      .matches("{ identifier , }");
  }

}
