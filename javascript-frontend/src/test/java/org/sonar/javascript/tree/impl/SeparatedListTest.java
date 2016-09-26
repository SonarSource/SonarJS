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

import com.google.common.base.Functions;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import org.junit.Test;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import static org.assertj.core.api.Assertions.assertThat;

public class SeparatedListTest {

  @Test
  public void constructor_should_succeed() throws Exception {
    List<String> list = Arrays.asList("hello", "world");
    List<InternalSyntaxToken> separators = Arrays.asList(createToken(","));

    SeparatedList<String> separatedList = new SeparatedList<String>(list, separators);
    
    assertThat(separatedList.size()).as("size of the separated list").isEqualTo(2);
    assertThat(separatedList.isEmpty()).as("the separated list is not empty").isFalse();
    assertThat(separatedList.elements().contains("world")).as("the separated list contains 'world'").isTrue();
    assertThat(separatedList.get(1)).as("second element of the separated list is 'world'").isEqualTo("world");
    assertThat(separatedList.separators().size()).as("the separated list has 1 separator").isEqualTo(1);
    assertThat(separatedList.separators().get(0).text()).as("the unique separator is ','").isEqualTo(",");
  }

  @Test(expected = IllegalArgumentException.class)
  public void constructor_should_fail_due_to_missing_separator() throws Exception {
    List<String> list = Arrays.asList("hello", "world");
    List<InternalSyntaxToken> separators = new ArrayList<>();
    
    new SeparatedList<>(list, separators);
  }

  @Test
  public void can_add_one_more_element() throws Exception {
    List<String> list = new LinkedList<>();
    list.add("hello");
    List<InternalSyntaxToken> separators = Arrays.asList(createToken(","));
    
    SeparatedList<String> separatedList = new SeparatedList<>(list, separators);
    
    separatedList.add("world");
    assertThat(separatedList.size()).as("size of the separated list").isEqualTo(2);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_two_more_elements() throws Exception {
    List<String> list = new LinkedList<>();
    list.add("hello");
    List<InternalSyntaxToken> separators = Arrays.asList(createToken(","));
    
    SeparatedList<String> separatedList = new SeparatedList<>(list, separators);
    
    separatedList.add("world");
    assertThat(separatedList.size()).as("size of the separated list").isEqualTo(2);

    separatedList.add("and fail!");
  }

  @Test
  public void elementsAndSeparators_are_ok() {   
    List<SyntaxToken> list = new LinkedList<>();
    list.add(createToken("hello"));
    list.add(createToken("world"));
    List<InternalSyntaxToken> separators = Arrays.asList(createToken(","));
  
    SeparatedList<SyntaxToken> separatedList = new SeparatedList<>(list, separators);
    Iterator<Tree> iterator = separatedList.elementsAndSeparators(Functions.<SyntaxToken>identity());
    SyntaxToken tree = null;

    assertThat(iterator.hasNext()).as("has at least 1 element").isTrue();
    tree = (SyntaxToken) iterator.next();
    assertThat(tree.text()).as("text of element 1").isEqualTo("hello");

    assertThat(iterator.hasNext()).as("has at least 2 elements").isTrue();
    tree = (SyntaxToken) iterator.next();
    assertThat(tree.text()).as("text of element 2").isEqualTo(",");

    assertThat(iterator.hasNext()).as("has at least 3 elements").isTrue();
    tree = (SyntaxToken) iterator.next();
    assertThat(tree.text()).as("text of element 3").isEqualTo("world");

    assertThat(iterator.hasNext()).as("has only 3 elements").isFalse();
  }

  private InternalSyntaxToken createToken(String value) {
    return new InternalSyntaxToken(1, 0, value, null, 0, false);
  }

}
