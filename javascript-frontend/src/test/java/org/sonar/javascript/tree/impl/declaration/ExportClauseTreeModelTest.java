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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.ExportClauseTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ExportClauseTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void with_from_clause() throws Exception {
    ExportClauseTree tree = parse("export { } from \"mod\";", Kind.EXPORT_CLAUSE);

    assertThat(tree.is(Kind.EXPORT_CLAUSE)).isTrue();
    assertThat(tree.exports()).isNotNull();
    assertThat(expressionToString(tree.exports())).isEqualTo("{ }");
    assertThat(tree.fromClause()).isNotNull();
    assertThat(expressionToString(tree.fromClause())).isEqualTo("from \"mod\"");
    assertThat(tree.semicolonToken()).isNotNull();
  }


  @Test
  public void without_from_clause() throws Exception {
    ExportClauseTree tree = parse("export { } ;", Kind.EXPORT_CLAUSE);

    assertThat(tree.is(Kind.EXPORT_CLAUSE)).isTrue();
    assertThat(tree.flowTypeToken()).isNull();
    assertThat(tree.exports()).isNotNull();
    assertThat(expressionToString(tree.exports())).isEqualTo("{ }");
    assertThat(tree.fromClause()).isNull();
    assertThat(tree.semicolonToken()).isNotNull();
  }

  @Test
  public void flow_syntax() throws Exception {
    ExportClauseTree tree = parse("export type { Foo } from 'bar' ;", Kind.EXPORT_CLAUSE);

    assertThat(tree.is(Kind.EXPORT_CLAUSE)).isTrue();
    assertThat(tree.flowTypeToken()).isNotNull();
  }

}
