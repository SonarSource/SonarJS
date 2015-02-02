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

import static org.fest.assertions.Assertions.assertThat;
import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.ExportClauseTree;

public class ExportClauseTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void with_from_clause() throws Exception {
    ExportClauseTree tree = parse("export { } from \"mod\";", Kind.EXPORT_CLAUSE);

    assertThat(tree.is(Kind.EXPORT_CLAUSE)).isTrue();
    assertThat(tree.exports()).isNotNull();
    assertThat(expressionToString(tree.exports())).isEqualTo("{ }");
    assertThat(tree.fromClause()).isNotNull();
    assertThat(expressionToString(tree.fromClause())).isEqualTo("from \"mod\"");
    // TODO: add eos
  }


  @Test
  public void without_from_clause() throws Exception {
    ExportClauseTree tree = parse("export { } ;", Kind.EXPORT_CLAUSE);

    assertThat(tree.is(Kind.EXPORT_CLAUSE)).isTrue();
    assertThat(tree.exports()).isNotNull();
    assertThat(expressionToString(tree.exports())).isEqualTo("{ }");
    assertThat(tree.fromClause()).isNull();
    // TODO: add eos
  }

}
