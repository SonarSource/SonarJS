/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

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
    SyntaxToken token = tree.getFirstToken();

    assertThat(token).isNotNull();
    assertThat(token.toString()).isEqualTo("first");
  }

  @Test
  public void get_last_token() throws Exception {
    SyntaxToken token = tree.getLastToken();

    assertThat(token).isNotNull();
    assertThat(token.toString()).isEqualTo("last");
  }

  @Test
  public void to_string() throws Exception {
    assertThat(tree.toString()).isEqualTo("child child ");
  }

  @Test
  public void get_line() throws Exception {
    assertThat(tree.getLine()).isEqualTo(1967);
  }

  private JavaScriptTree createTree() {
    // usage of Mockito.CALLS_REAL_METHODS allows us to use abstract classes

    TestChildTree child1 = mock(TestChildTree.class, Mockito.CALLS_REAL_METHODS);
    TestChildTree child2 = mock(TestChildTree.class, Mockito.CALLS_REAL_METHODS);

    JavaScriptTree tree = mock(JavaScriptTree.class);
    when(tree.toString()).thenCallRealMethod();
    when(tree.getFirstToken()).thenCallRealMethod();
    when(tree.getLastToken()).thenCallRealMethod();
    when(tree.getLine()).thenCallRealMethod();
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
    public SyntaxToken getFirstToken() {
      SyntaxToken token = Mockito.mock(SyntaxToken.class);
      Mockito.when(token.toString()).thenReturn("first");
      Mockito.when(token.line()).thenReturn(1967);
      return token;
    }

    @Override
    public SyntaxToken getLastToken() {
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
