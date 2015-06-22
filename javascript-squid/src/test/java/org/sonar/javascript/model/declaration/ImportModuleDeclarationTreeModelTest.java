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
import org.sonar.plugins.javascript.api.tree.declaration.ImportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportModuleDeclarationTree;

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
    // TODO: add eos
  }

  @Test
  public void import_module_declaration() throws Exception {
    ImportModuleDeclarationTree tree = parse("import \"mod\" ;", Kind.IMPORT_MODULE_DECLARATION);

    assertThat(tree.is(Kind.IMPORT_MODULE_DECLARATION)).isTrue();
    assertThat(tree.importToken().text()).isEqualTo("import");
    assertThat(tree.moduleName().value()).isEqualTo("\"mod\"");
    // TODO: add eos
  }

}
