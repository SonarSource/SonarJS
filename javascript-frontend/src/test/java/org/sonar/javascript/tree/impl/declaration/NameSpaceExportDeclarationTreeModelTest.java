/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceExportDeclarationTree;

import static org.assertj.core.api.Assertions.assertThat;

public class NameSpaceExportDeclarationTreeModelTest extends JavaScriptTreeModelTest {


  @Test
  public void test() throws Exception {
    NameSpaceExportDeclarationTree tree = parse("export * from \"mod\";", Kind.NAMESPACE_EXPORT_DECLARATION);

    assertThat(tree.is(Kind.NAMESPACE_EXPORT_DECLARATION)).isTrue();
    assertThat(tree.exportToken().text()).isEqualTo("export");
    assertThat(tree.starToken().text()).isEqualTo("*");
    assertThat(tree.asToken()).isNull();
    assertThat(tree.synonymIdentifier()).isNull();
    assertThat(tree.fromClause()).isNotNull();
    assertThat(expressionToString(tree.fromClause())).isEqualTo("from \"mod\"");
    assertThat(tree.semicolonToken()).isNotNull();
  }

  @Test
  public void with_synonym() throws Exception {
    NameSpaceExportDeclarationTree tree = parse("export * as ExportedName from \"mod\";", Kind.NAMESPACE_EXPORT_DECLARATION);

    assertThat(tree.is(Kind.NAMESPACE_EXPORT_DECLARATION)).isTrue();
    assertThat(tree.exportToken().text()).isEqualTo("export");
    assertThat(tree.starToken().text()).isEqualTo("*");
    assertThat(tree.asToken().text()).isEqualTo("as");
    assertThat(tree.synonymIdentifier().name()).isEqualTo("ExportedName");
    assertThat(tree.fromClause()).isNotNull();
    assertThat(expressionToString(tree.fromClause())).isEqualTo("from \"mod\"");
    assertThat(tree.semicolonToken()).isNotNull();
  }

}
