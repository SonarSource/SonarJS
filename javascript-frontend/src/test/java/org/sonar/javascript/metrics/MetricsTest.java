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
package org.sonar.javascript.metrics;

import java.io.File;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.fest.assertions.Assertions.assertThat;

public class MetricsTest extends JavaScriptTreeModelTest {

  @Test
  public void complexity() {
    String path = "src/test/resources/metrics/complexity.js";
    Tree tree = p.parse(new File(path));
    assertThat(new ComplexityVisitor().getComplexity(tree)).isEqualTo(23);
  }

  @Test
  public void lines_of_code() {
    String path = "src/test/resources/metrics/lines_of_code.js";
    Tree tree = p.parse(new File(path));
    assertThat(new LineVisitor(tree).getLinesOfCodeNumber()).isEqualTo(3);
  }

  @Test
  public void lines() {
    String path = "src/test/resources/metrics/lines.js";
    Tree tree = p.parse(new File(path));
    LineVisitor lineVisitor = new LineVisitor(tree);
    assertThat(lineVisitor.getLinesNumber()).isEqualTo(5);
    assertThat(lineVisitor.getLinesOfCode()).containsOnly(2, 3, 4);
  }

  @Test
  public void functions() {
    String path = "src/test/resources/metrics/functions.js";
    Tree tree = p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getFunctionNumber()).isEqualTo(8);
  }

  @Test
  public void statements() {
    String path = "src/test/resources/metrics/functions.js";
    Tree tree = p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getStatementsNumber()).isEqualTo(10);

    path = "src/test/resources/metrics/statements.js";
    tree = p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getStatementsNumber()).isEqualTo(16);
  }

  @Test
  public void accessors() {
    String path = "src/test/resources/metrics/accessors.js";
    Tree tree = p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getAccessorsNumber()).isEqualTo(4);
  }

  @Test
  public void classes() {
    String path = "src/test/resources/metrics/classes.js";
    Tree tree = p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getClassNumber()).isEqualTo(3);
  }

  @Test
  public void comments() {
    String path = "src/test/resources/metrics/comments.js";
    Tree tree = p.parse(new File(path));
    CommentLineVisitor commentLineVisitor = new CommentLineVisitor(tree, true);
    assertThat(commentLineVisitor.getCommentLineNumber()).isEqualTo(2);
    assertThat(commentLineVisitor.noSonarLines()).containsOnly(10);
    assertThat(commentLineVisitor.getCommentLines()).containsOnly(5, 8);

    commentLineVisitor = new CommentLineVisitor(tree, false);
    assertThat(commentLineVisitor.getCommentLineNumber()).isEqualTo(3);
    assertThat(commentLineVisitor.noSonarLines()).containsOnly(10);
  }

}
