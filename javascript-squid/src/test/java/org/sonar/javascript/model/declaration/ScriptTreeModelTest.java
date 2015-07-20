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
package org.sonar.javascript.model.declaration;

import static org.fest.assertions.Assertions.assertThat;
import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class ScriptTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_statment() throws Exception {
    ScriptTree tree = parse("", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken()).isNull();
    assertThat(tree.items().items()).isEmpty();
    assertThat(tree.EOFToken()).isNotNull();

  }

  @Test
  public void with_statement() throws Exception {
    ScriptTree tree = parse("var i; var j;", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken()).isNull();
    assertThat(tree.items().items()).hasSize(2);
    assertThat(tree.EOFToken()).isNotNull();

  }

  @Test
  public void with_shebang() throws Exception {
    ScriptTree tree = parse("#!/bin/js\nvar i;", Kind.SCRIPT);

    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.shebangToken().text()).isEqualTo("#!/bin/js");
    assertThat(tree.items().items()).hasSize(1);
    assertThat(tree.EOFToken()).isNotNull();
  }
}
