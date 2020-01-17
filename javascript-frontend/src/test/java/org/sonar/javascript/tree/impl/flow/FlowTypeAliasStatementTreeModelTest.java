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
package org.sonar.javascript.tree.impl.flow;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAliasStatementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowTypeAliasStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowTypeAliasStatementTree tree = parse("type myAlias = ?string;", Kind.FLOW_TYPE_ALIAS_STATEMENT);

    assertThat(tree.is(Kind.FLOW_TYPE_ALIAS_STATEMENT)).isTrue();
    assertThat(tree.opaqueToken()).isNull();
    assertThat(tree.typeToken().text()).isEqualTo("type");
    assertThat(tree.typeAlias().name()).isEqualTo("myAlias");
    assertThat(tree.genericParameterClause()).isNull();
    assertThat(tree.type().is(Kind.FLOW_OPTIONAL_TYPE)).isTrue();
    assertThat(tree.semicolonToken().text()).isEqualTo(";");
  }

  @Test
  public void without_semicolon() throws Exception {
    FlowTypeAliasStatementTree tree = parse("type myAlias = ?string", Kind.FLOW_TYPE_ALIAS_STATEMENT);
    assertThat(tree.semicolonToken()).isNull();
  }

  @Test
  public void opaque() throws Exception {
    FlowTypeAliasStatementTree tree = parse("opaque type myAlias<T> : SuperType = ?string;", Kind.FLOW_TYPE_ALIAS_STATEMENT);

    assertThat(tree.opaqueToken().text()).isEqualTo("opaque");
    assertThat(tree.genericParameterClause().genericParameters()).hasSize(1);
    assertThat(tree.superTypeAnnotation().type().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();
  }

}
