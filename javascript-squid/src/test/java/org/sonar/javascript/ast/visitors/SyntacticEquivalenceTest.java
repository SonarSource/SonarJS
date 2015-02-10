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
package org.sonar.javascript.ast.visitors;

import static org.fest.assertions.Assertions.assertThat;

import org.junit.Test;
import org.sonar.javascript.ast.parser.TreeFactory;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;

public class SyntacticEquivalenceTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    Tree tree1 = parse("if (a) ;", Tree.Kind.IF_STATEMENT);
    Tree tree2 = parse("if (a) ;", Tree.Kind.IF_STATEMENT);

    Tree tree3 = parse("if (b) ;", Tree.Kind.IF_STATEMENT);
    Tree tree4 = parse("if (b) break;", Tree.Kind.IF_STATEMENT);
    Tree tree5 = parse("var a;", Tree.Kind.VAR_DECLARATION);

    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree1)).isTrue();
    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree2)).isTrue();

    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree3)).isFalse();
    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree4)).isFalse();
    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree4)).isFalse();

    assertThat(SyntacticEquivalence.areEquivalent(tree1, null)).isFalse();
    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree5)).isFalse();
  }

  @Test
  public void test_equivalence_for_tree_list() throws Exception {
    ParameterListTree tree1 = parse("f(a, b, c) ;", Tree.Kind.ARGUMENTS);
    ParameterListTree tree2 = parse("f(a, b, c) ;", Tree.Kind.ARGUMENTS);
    ParameterListTree tree3 = parse("f(a, b) ;", Tree.Kind.ARGUMENTS);
    ParameterListTree tree4 = parse("f(a, b, b) ;", Tree.Kind.ARGUMENTS);

    assertThat(SyntacticEquivalence.areEquivalent(tree1.parameters(), tree1.parameters())).isTrue();
    assertThat(SyntacticEquivalence.areEquivalent(tree1.parameters(), tree2.parameters())).isTrue();

    assertThat(SyntacticEquivalence.areEquivalent(tree1.parameters(), tree3.parameters())).isFalse();
    assertThat(SyntacticEquivalence.areEquivalent(tree1.parameters(), tree4.parameters())).isFalse();
  }

  @Test
  public void test_equivalence_for_empty_tree_list() throws Exception {
    ParameterListTree tree1 = parse("f() ;", Tree.Kind.ARGUMENTS);
    ParameterListTree tree2 = parse("f() ;", Tree.Kind.ARGUMENTS);

    assertThat(SyntacticEquivalence.areEquivalent(tree1.parameters(), tree1.parameters())).isFalse();
    assertThat(SyntacticEquivalence.areEquivalent(tree1.parameters(), tree2.parameters())).isFalse();
  }

  @Test
  public void test_equivalence_for_tokens() throws Exception {
    Tree tree1 = parse("true;", Tree.Kind.BOOLEAN_LITERAL);
    Tree tree2 = parse("false;", Tree.Kind.BOOLEAN_LITERAL);

    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree1)).isTrue();
    assertThat(SyntacticEquivalence.areEquivalent(tree1, tree2)).isFalse();
  }

  @Test(expected=IllegalArgumentException.class)
  public void test_are_leafs_with_other_than_leaf() throws Exception {
    JavaScriptTree tree1 = parse("true;", Tree.Kind.SCRIPT);
    assertThat(SyntacticEquivalence.areLeafsEquivalent(tree1, tree1)).isTrue();
  }

}
