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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.flow.FlowIndexerPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowMethodPropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimplePropertyDefinitionKeyTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowSimpleTypeTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowPropertyDefinitionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void simple_property() throws Exception {
    FlowPropertyDefinitionTree tree = parse("id: number", Tree.Kind.FLOW_PROPERTY_DEFINITION, Tree.Kind.FLOW_PROPERTY_DEFINITION);

    assertThat(tree.is(Tree.Kind.FLOW_PROPERTY_DEFINITION)).isTrue();
    assertThat(tree.key().is(Kind.FLOW_SIMPLE_PROPERTY_DEFINITION_KEY)).isTrue();
    assertThat(tree.plusOrMinusToken()).isNull();
    assertThat(tree.staticToken()).isNull();
    assertThat(((FlowSimplePropertyDefinitionKeyTree) tree.key()).queryToken()).isNull();
    assertThat(((FlowSimplePropertyDefinitionKeyTree) tree.key()).nameToken().text()).isEqualTo("id");
    assertThat(tree.typeAnnotation().type().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();
  }

  @Test
  public void with_minus() throws Exception {
    FlowPropertyDefinitionTree tree = parse("-id: number", Tree.Kind.FLOW_PROPERTY_DEFINITION, Tree.Kind.FLOW_PROPERTY_DEFINITION);

    assertThat(tree.is(Tree.Kind.FLOW_PROPERTY_DEFINITION)).isTrue();
    assertThat(tree.plusOrMinusToken().text()).isEqualTo("-");
  }

  @Test
  public void optional_property() throws Exception {
    FlowPropertyDefinitionTree tree = parse("id?: number", Tree.Kind.FLOW_PROPERTY_DEFINITION, Tree.Kind.FLOW_PROPERTY_DEFINITION);

    assertThat(tree.is(Tree.Kind.FLOW_PROPERTY_DEFINITION)).isTrue();
    assertThat(tree.key()).isNotNull();
    assertThat(((FlowSimplePropertyDefinitionKeyTree) tree.key()).queryToken()).isNotNull();
    assertThat(((FlowSimplePropertyDefinitionKeyTree) tree.key()).nameToken().text()).isEqualTo("id");
  }

  @Test
  public void indexer_property() throws Exception {
    FlowIndexerPropertyDefinitionKeyTree tree = parse("[MyType]: number", Tree.Kind.FLOW_INDEXER_PROPERTY_DEFINITION_KEY, Tree.Kind.FLOW_PROPERTY_DEFINITION);

    assertThat(tree.colonToken()).isNull();
    assertThat(tree.identifier()).isNull();
    assertThat(tree.type().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();
    assertThat(((FlowSimpleTypeTree) tree.type()).token().text()).isEqualTo("MyType");
    assertThat(tree.lbracketToken().text()).isEqualTo("[");
    assertThat(tree.rbracketToken().text()).isEqualTo("]");
  }

  @Test
  public void indexer_property_with_name() throws Exception {
    FlowIndexerPropertyDefinitionKeyTree tree = parse("[idx: MyType]: number", Kind.FLOW_INDEXER_PROPERTY_DEFINITION_KEY, Tree.Kind.FLOW_PROPERTY_DEFINITION);

    assertThat(tree.is(Kind.FLOW_INDEXER_PROPERTY_DEFINITION_KEY)).isTrue();
    assertThat(tree.colonToken()).isNotNull();
    assertThat(tree.identifier()).isNotNull();
    assertThat(tree.identifier().name()).isEqualTo("idx");
    assertThat(((FlowSimpleTypeTree) tree.type()).token().text()).isEqualTo("MyType");
  }

  @Test
  public void method() throws Exception {
    FlowMethodPropertyDefinitionKeyTree tree = parse("static foo(number): number", Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY, Tree.Kind.FLOW_PROPERTY_DEFINITION);

    assertThat(tree.is(Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY)).isTrue();
    assertThat(tree.methodName().name()).isEqualTo("foo");
    assertThat(tree.parameterClause().parameters()).hasSize(1);
  }

  @Test
  public void callable() throws Exception {
    FlowMethodPropertyDefinitionKeyTree tree = parse("(number): number", Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY, Tree.Kind.FLOW_PROPERTY_DEFINITION);

    assertThat(tree.is(Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY)).isTrue();
    assertThat(tree.genericParameterClause()).isNull();
    assertThat(tree.methodName()).isNull();
    assertThat(tree.parameterClause().parameters()).hasSize(1);
  }

  @Test
  public void method_with_generic() throws Exception {
    FlowMethodPropertyDefinitionKeyTree tree = parse("<T>(number): number", Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY, Tree.Kind.FLOW_PROPERTY_DEFINITION);
    assertThat(tree.genericParameterClause().genericParameters()).hasSize(1);

    tree = parse("foo<T>(number): number", Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY, Tree.Kind.FLOW_PROPERTY_DEFINITION);
    assertThat(tree.genericParameterClause().genericParameters()).hasSize(1);
  }

  @Test
  public void static_callable() throws Exception {
    FlowPropertyDefinitionTree tree = parse("static(number): number", Kind.FLOW_PROPERTY_DEFINITION, Tree.Kind.FLOW_PROPERTY_DEFINITION);
    assertThat(tree.key().is(Kind.FLOW_METHOD_PROPERTY_DEFINITION_KEY)).isTrue();
    assertThat(tree.staticToken().text()).isEqualTo("static");
  }

  @Test
  public void static_named_property() throws Exception {
    FlowPropertyDefinitionTree tree = parse("static: number", Kind.FLOW_PROPERTY_DEFINITION, Tree.Kind.FLOW_PROPERTY_DEFINITION);
    assertThat(tree.key().is(Kind.FLOW_SIMPLE_PROPERTY_DEFINITION_KEY)).isTrue();
    assertThat(tree.staticToken()).isNull();
    assertThat(((FlowSimplePropertyDefinitionKeyTree) tree.key()).nameToken().text()).isEqualTo("static");
  }

}
