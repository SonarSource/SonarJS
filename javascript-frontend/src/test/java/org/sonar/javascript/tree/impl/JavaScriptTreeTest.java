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
package org.sonar.javascript.tree.impl;

import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class JavaScriptTreeTest extends JavaScriptTreeModelTest {

  private JavaScriptTree tree;

  @Before
  public void setUp() {
    tree = createTree();
  }

  @Test
  public void is_leaf() throws Exception {
    assertThat(tree.isLeaf()).isFalse();
  }

  @Test
  public void get_kind() throws Exception {
    assertThat(tree.is(Kind.SCRIPT)).isTrue();
    assertThat(tree.is(Kind.ARRAY_LITERAL)).isFalse();
  }

  @Test
  public void get_first_token() throws Exception {
    SyntaxToken token = tree.firstToken();

    assertThat(token).isNotNull();
    assertThat(token.toString()).isEqualTo("first");
  }

  @Test
  public void get_last_token() throws Exception {
    SyntaxToken token = tree.lastToken();

    assertThat(token).isNotNull();
    assertThat(token.toString()).isEqualTo("last");
  }

  @Test
  public void to_string() throws Exception {
    assertThat(tree.toString()).isEqualTo("child child ");
  }

  @Test
  public void no_descendants_in_token() throws Exception {
    JavaScriptTree token = parse("a", Kind.TOKEN);
    assertThat(token.descendants().count()).isEqualTo(0);
  }

  @Test
  public void descendants_include_all_immediate_children() throws Exception {
    VariableStatementTree variable = parse("var a;", Kind.VARIABLE_STATEMENT);
    Set<JavaScriptTree> descendants = ((JavaScriptTree) variable).descendants().collect(Collectors.toSet());
    JavaScriptTree declaration = (JavaScriptTree) variable.declaration();
    JavaScriptTree semicolonToken = (JavaScriptTree) variable.semicolonToken();
    assertThat(descendants).contains(declaration, semicolonToken);
  }

  @Test
  public void descendants_include_children_of_children() throws Exception {
    VariableStatementTree variable = parse("var a;", Kind.VARIABLE_STATEMENT);
    Set<JavaScriptTree> descendants = ((JavaScriptTree) variable).descendants().collect(Collectors.toSet());
    IdentifierTree identifier = (IdentifierTree) variable.declaration().variables().get(0);
    JavaScriptTree declarationToken = (JavaScriptTree) variable.declaration().token();
    JavaScriptTree identifierToken = (JavaScriptTree) identifier.identifierToken();
    assertThat(descendants).contains(declarationToken, (JavaScriptTree) identifier, identifierToken);
  }

  private JavaScriptTree createTree() {
    // usage of Mockito.CALLS_REAL_METHODS allows us to use abstract classes

    TestChildTree child1 = mock(TestChildTree.class, Mockito.CALLS_REAL_METHODS);
    TestChildTree child2 = mock(TestChildTree.class, Mockito.CALLS_REAL_METHODS);

    JavaScriptTree tree = mock(JavaScriptTree.class);
    when(tree.toString()).thenCallRealMethod();
    when(tree.firstToken()).thenCallRealMethod();
    when(tree.lastToken()).thenCallRealMethod();
    when(tree.getKind()).thenReturn(Kind.SCRIPT);
    when(tree.childrenIterator()).thenReturn(Arrays.asList((Tree) child1, (Tree) child2).iterator());

    return tree;
  }

  /**
   * Test class for the children of a {@link JavaScriptTree}.
   * In this case it is more readable to implement a class than to use all smart features of Mockito.
   */
  private static abstract class TestChildTree extends JavaScriptTree {

    @Override
    public Iterator<Tree> childrenIterator() {
      return new LinkedList<Tree>().iterator();
    }

    @Override
    public SyntaxToken firstToken() {
      SyntaxToken token = Mockito.mock(SyntaxToken.class);
      Mockito.when(token.toString()).thenReturn("first");
      Mockito.when(token.line()).thenReturn(1967);
      return token;
    }

    @Override
    public SyntaxToken lastToken() {
      SyntaxToken token = Mockito.mock(SyntaxToken.class);
      Mockito.when(token.toString()).thenReturn("last");
      return token;
    }

    @Override
    public String toString() {
      return "child";
    }

  }

}
