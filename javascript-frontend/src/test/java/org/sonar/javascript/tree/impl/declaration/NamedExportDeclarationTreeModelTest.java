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
package org.sonar.javascript.tree.impl.declaration;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBinding;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithExportList;
import org.sonar.plugins.javascript.api.tree.declaration.ExportDefaultBindingWithNameSpaceExport;
import org.sonar.plugins.javascript.api.tree.declaration.NamedExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;

import static org.assertj.core.api.Assertions.assertThat;

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
    NamedExportDeclarationTree tree = parse("@dec export class C { }", Kind.NAMED_EXPORT_DECLARATION);

    assertThat(tree.is(Kind.NAMED_EXPORT_DECLARATION)).isTrue();
    assertThat(tree.exportToken().text()).isEqualTo("export");
    assertThat(expressionToString(tree.object())).isEqualTo("class C { }");
    assertThat(tree.decorators()).hasSize(1);
    // TODO: add eos
  }

  @Test
  public void export_default_binding() throws Exception {
    NamedExportDeclarationTree tree = parse("export A from 'mod';", Kind.NAMED_EXPORT_DECLARATION);
    assertThat(tree.object().is(Kind.EXPORT_DEFAULT_BINDING)).isTrue();

    ExportDefaultBinding exportDefaultBinding = (ExportDefaultBinding) tree.object();
    assertThat(exportDefaultBinding.exportedDefaultIdentifier().name()).isEqualTo("A");
    assertThat(expressionToString(exportDefaultBinding.fromClause())).isEqualTo("from 'mod'");
    assertThat(exportDefaultBinding.semicolonToken().text()).isEqualTo(";");
  }

  @Test
  public void export_default_binding_and_star() throws Exception {
    NamedExportDeclarationTree tree = parse("export A, * as B from 'mod';", Kind.NAMED_EXPORT_DECLARATION);
    assertThat(tree.object().is(Kind.EXPORT_DEFAULT_BINDING_WITH_NAMESPACE_EXPORT)).isTrue();

    ExportDefaultBindingWithNameSpaceExport exportDefaultBinding = (ExportDefaultBindingWithNameSpaceExport) tree.object();
    assertThat(exportDefaultBinding.exportedDefaultIdentifier().name()).isEqualTo("A");
    assertThat(exportDefaultBinding.commaToken().text()).isEqualTo(",");
    assertThat(exportDefaultBinding.starToken().text()).isEqualTo("*");
    assertThat(exportDefaultBinding.asToken().text()).isEqualTo("as");
    assertThat(exportDefaultBinding.synonymIdentifier().name()).isEqualTo("B");
    assertThat(expressionToString(exportDefaultBinding.fromClause())).isEqualTo("from 'mod'");
    assertThat(exportDefaultBinding.semicolonToken().text()).isEqualTo(";");
  }

  @Test
  public void export_default_binding_and_export_list() throws Exception {
    NamedExportDeclarationTree tree = parse("export A, {B, C, D as DD} from 'mod';", Kind.NAMED_EXPORT_DECLARATION);
    assertThat(tree.object().is(Kind.EXPORT_DEFAULT_BINDING_WITH_EXPORT_LIST)).isTrue();

    ExportDefaultBindingWithExportList exportDefaultBinding = (ExportDefaultBindingWithExportList) tree.object();
    assertThat(exportDefaultBinding.exportedDefaultIdentifier().name()).isEqualTo("A");
    assertThat(exportDefaultBinding.commaToken().text()).isEqualTo(",");
    assertThat(expressionToString(exportDefaultBinding.exportList())).isEqualTo("{B, C, D as DD}");
    assertThat(expressionToString(exportDefaultBinding.fromClause())).isEqualTo("from 'mod'");
    assertThat(exportDefaultBinding.semicolonToken().text()).isEqualTo(";");
  }

  @Test
  public void flow() throws Exception {
    NamedExportDeclarationTree tree = parse("export type A = B;", Kind.NAMED_EXPORT_DECLARATION);
    assertThat(tree.object().is(Kind.FLOW_TYPE_ALIAS_STATEMENT)).isTrue();

    tree = parse("export interface Foo{}", Kind.NAMED_EXPORT_DECLARATION);
    assertThat(tree.object().is(Kind.FLOW_INTERFACE_DECLARATION)).isTrue();
  }

  @Test
  public void export_default_as() throws Exception {
    NamedExportDeclarationTree tree = parse("export {default as xyz} from './other-module';", Kind.NAMED_EXPORT_DECLARATION);
    ExportClauseTree exportClauseTree = (ExportClauseTree) tree.object();
    SeparatedList<SpecifierTree> specifiers = exportClauseTree.exports().specifiers();
    assertThat(specifiers.get(0).leftName().name()).isEqualTo("default");
    assertThat(specifiers.get(0).rightName().name()).isEqualTo("xyz");
  }

  @Test
  public void export_default() throws Exception {
    NamedExportDeclarationTree tree = parse("export { default } from './other-module';", Kind.NAMED_EXPORT_DECLARATION);
    ExportClauseTree exportClauseTree = (ExportClauseTree) tree.object();
    SeparatedList<SpecifierTree> specifiers = exportClauseTree.exports().specifiers();
    assertThat(specifiers.get(0).leftName().name()).isEqualTo("default");
    assertThat(specifiers.get(0).rightName()).isNull();
  }


}
