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
package org.sonar.javascript.model.declaration;

import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;

import static org.fest.assertions.Assertions.assertThat;

public class ScriptTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    ScriptTree tree = parse("", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken()).isNull();
    assertThat(tree.items().items()).isEmpty();

    tree = parse("var i; var j;", Kind.SCRIPT);
    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken()).isNull();
    assertThat(tree.items().items()).hasSize(2);

    tree = parse("#!/bin/js\nvar i;", Kind.SCRIPT);
    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken().text()).isEqualTo("#!/bin/js");
    assertThat(tree.items().items()).hasSize(1);
  }

}
