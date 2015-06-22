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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.NamedExportDeclarationTree;

public class NamedExportDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void export_clause() throws Exception {
    NamedExportDeclarationTree tree = parse("export { } ;", Kind.NAMED_EXPORT_DECLARATION);

    assertThat(tree.is(Kind.NAMED_EXPORT_DECLARATION)).isTrue();
    assertThat(tree.exportToken().text()).isEqualTo("export");
    assertThat(expressionToString(tree.object())).isEqualTo("{ } ;");
    // TODO: add eos
  }

  @Test
  public void variable_statement() throws Exception {
    NamedExportDeclarationTree tree = parse("export var a ;", Kind.NAMED_EXPORT_DECLARATION);

    assertThat(tree.is(Kind.NAMED_EXPORT_DECLARATION)).isTrue();
    assertThat(tree.exportToken().text()).isEqualTo("export");
    assertThat(expressionToString(tree.object())).isEqualTo("var a ;");
    // TODO: add eos
  }

  @Test
  public void declaration() throws Exception {
    NamedExportDeclarationTree tree = parse("export class C { }", Kind.NAMED_EXPORT_DECLARATION);

    assertThat(tree.is(Kind.NAMED_EXPORT_DECLARATION)).isTrue();
    assertThat(tree.exportToken().text()).isEqualTo("export");
    assertThat(expressionToString(tree.object())).isEqualTo("class C { }");
    // TODO: add eos
  }

}
