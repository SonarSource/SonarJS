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
package org.sonar.javascript.tree.impl.declaration;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ImportModuleDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void import_declaration() throws Exception {
    ImportDeclarationTree tree = parse("import a from \"mod\" ;", Kind.IMPORT_DECLARATION);

    assertThat(tree.is(Kind.IMPORT_DECLARATION)).isTrue();
    assertThat(tree.importToken().text()).isEqualTo("import");
    assertThat(tree.importClause()).isNotNull();
    assertThat(expressionToString(tree.importClause())).isEqualTo("a");
    assertThat(tree.fromClause()).isNotNull();
    assertThat(expressionToString(tree.fromClause())).isEqualTo("from \"mod\"");
    assertThat(tree.semicolonToken()).isNotNull();
  }

  @Test
  public void import_list() throws Exception {
    ImportDeclarationTree tree = parse("import { foo, bar as bar2 } from 'mod' ;", Kind.IMPORT_DECLARATION);
    ImportClauseTree importClause = (ImportClauseTree) tree.importClause();
    SpecifierListTree namedImport = (SpecifierListTree) importClause.namedImport();
    assertSpecifierTree(namedImport.specifiers().get(0), "foo", null, null);
    assertSpecifierTree(namedImport.specifiers().get(1), "bar", "as", "bar2");
    assertThat(expressionToString(tree.fromClause())).isEqualTo("from 'mod'");
  }

  @Test
  public void namespace() throws Exception {
    ImportDeclarationTree tree = parse("import * as foo from 'mod' ;", Kind.IMPORT_DECLARATION);
    ImportClauseTree importClause = (ImportClauseTree) tree.importClause();
    assertSpecifierTree((SpecifierTree) importClause.namedImport(), "*", "as", "foo");
  }

  @Test
  public void import_module_declaration() throws Exception {
    ImportModuleDeclarationTree tree = parse("import \"mod\" ;", Kind.IMPORT_MODULE_DECLARATION);

    assertThat(tree.is(Kind.IMPORT_MODULE_DECLARATION)).isTrue();
    assertThat(tree.importToken().text()).isEqualTo("import");
    assertThat(tree.moduleName().value()).isEqualTo("\"mod\"");
    assertThat(tree.semicolonToken()).isNotNull();
  }

  private void assertSpecifierTree(SpecifierTree tree, String expectedName, String expectedAsToken, String expectedLocalName) {
    assertTreeValue(tree.name(), expectedName);
    assertTreeValue(tree.asToken(), expectedAsToken);
    assertTreeValue(tree.localName(), expectedLocalName);
  }

  private void assertTreeValue(Tree tree, String expectedValue) {
    if (expectedValue == null) {
      assertThat(tree).isNull();
    } else {
      assertThat(expressionToString(tree)).isEqualTo(expectedValue);
    }
  }

}
