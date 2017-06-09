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
package org.sonar.javascript.metrics;

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Sets;
import java.io.File;
import java.util.Set;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;

public class MetricsTest extends JavaScriptTreeModelTest {

  @Test
  public void complexity() {
    Tree tree = parse(new File("src/test/resources/metrics/complexity.js"));
    assertThat(new ComplexityVisitor(true).getComplexity(tree)).isEqualTo(25);
  }

  @Test
  public void cognitive_complexity() {
    ScriptTree tree = parse(new File("src/test/resources/metrics/cognitive_complexity.js"));
    assertThat(new CognitiveComplexity().calculateScriptComplexity(tree).complexity()).isEqualTo(9);
  }

  @Test
  public void lines_of_code() {
    Tree tree = parse(new File("src/test/resources/metrics/lines_of_code.js"));
    assertThat(new LineVisitor(tree).getLinesOfCodeNumber()).isEqualTo(3);
  }

  @Test
  public void lines() {
    ScriptTree tree = parse(new File("src/test/resources/metrics/lines.js"));
    LineVisitor lineVisitor = new LineVisitor(tree);
    assertThat(lineVisitor.getLinesOfCode()).containsOnly(2, 3, 4);

    lineVisitor = new LineVisitor(tree.items().items());
    assertThat(lineVisitor.getLinesOfCode()).containsOnly(2, 3, 4);
  }

  @Test
  public void functions() {
    Tree tree = parse(new File("src/test/resources/metrics/functions.js"));
    assertThat(new CounterVisitor(tree).getFunctionNumber()).isEqualTo(14);
  }

  @Test
  public void statements() {
    Tree tree = parse(new File("src/test/resources/metrics/functions.js"));
    assertThat(new CounterVisitor(tree).getStatementsNumber()).isEqualTo(16);

    tree = parse(new File("src/test/resources/metrics/statements.js"));
    assertThat(new CounterVisitor(tree).getStatementsNumber()).isEqualTo(16);
  }

  @Test
  public void classes() {
    Tree tree = parse(new File("src/test/resources/metrics/classes.js"));
    assertThat(new CounterVisitor(tree).getClassNumber()).isEqualTo(3);
  }

  @Test
  public void comments() {
    Tree tree = parse(new File("src/test/resources/metrics/comments.js"));
    CommentLineVisitor commentLineVisitor = new CommentLineVisitor(tree, true);
    assertThat(commentLineVisitor.getCommentLineNumber()).isEqualTo(2);
    assertThat(commentLineVisitor.noSonarLines()).containsOnly(10);
    assertThat(commentLineVisitor.getCommentLines()).containsOnly(5, 8);

    commentLineVisitor = new CommentLineVisitor(tree, false);
    assertThat(commentLineVisitor.getCommentLineNumber()).isEqualTo(3);
    assertThat(commentLineVisitor.noSonarLines()).containsOnly(10);
  }

  @Test
  public void executable_lines() throws Exception {
    Tree tree = parse(new File("src/test/resources/metrics/executable_lines.js"));
    Set<Integer> commentLines = new CommentLineVisitor(tree, false).getCommentLines();
    Set<Integer> expectedExecutableLines = Sets.difference(commentLines, ImmutableSet.of(1));
    assertThat(new ExecutableLineVisitor(tree).getExecutableLines()).isEqualTo(expectedExecutableLines);
  }

}
