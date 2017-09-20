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
package org.sonar.javascript.tree.impl.flow;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowIndexerPropertyTypeKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimplePropertyTypeKeyTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowPropertyTypeTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void simple_property() throws Exception {
    FlowPropertyTypeTree tree = parse("id: number", Tree.Kind.FLOW_PROPERTY_TYPE, Tree.Kind.FLOW_PROPERTY_TYPE);

    assertThat(tree.is(Tree.Kind.FLOW_PROPERTY_TYPE)).isTrue();
    assertThat(tree.key().identifier()).isNotNull();
    assertThat(tree.key()).isNotNull();
    assertThat(tree.typeAnnotation()).isNotNull();
  }

  @Test
  public void optional_property() throws Exception {
    FlowPropertyTypeTree tree = parse("id?: number", Tree.Kind.FLOW_PROPERTY_TYPE, Tree.Kind.FLOW_PROPERTY_TYPE);

    assertThat(tree.is(Tree.Kind.FLOW_PROPERTY_TYPE)).isTrue();
    assertThat(tree.key()).isNotNull();
    assertThat(((FlowSimplePropertyTypeKeyTree) tree.key()).queryToken()).isNotNull();
    assertThat(tree.typeAnnotation()).isNotNull();
  }

  @Test
  public void indexer_property() throws Exception {
    FlowPropertyTypeTree tree = parse("[idx]: number", Tree.Kind.FLOW_PROPERTY_TYPE, Tree.Kind.FLOW_PROPERTY_TYPE);

    assertThat(tree.is(Tree.Kind.FLOW_PROPERTY_TYPE)).isTrue();
    assertThat(tree.key()).isNotNull();
    assertThat(((FlowIndexerPropertyTypeKeyTree) tree.key()).lbracketToken()).isNotNull();
    assertThat(((FlowIndexerPropertyTypeKeyTree) tree.key()).rbracketToken()).isNotNull();
    assertThat(tree.typeAnnotation()).isNotNull();
  }

}
