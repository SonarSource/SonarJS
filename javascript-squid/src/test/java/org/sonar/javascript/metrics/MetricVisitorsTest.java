/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.metrics;

import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;

public class MetricVisitorsTest extends JavaScriptTreeModelTest {

  @Test
  public void complexity() {
    String path = "src/test/resources/metrics/complexity.js";
    Tree tree = (Tree) p.parse(new File(path));
    assertThat(new ComplexityVisitor().getComplexity(tree)).isEqualTo(20);
  }

  @Test
  public void lines_of_code() {
    String path = "src/test/resources/metrics/lines_of_code.js";
    Tree tree = (Tree) p.parse(new File(path));
    assertThat(new LinesOfCodeVisitor().getLinesOfCodeNumber(tree)).isEqualTo(3);
  }

  @Test
  public void functions() {
    String path = "src/test/resources/metrics/functions.js";
    Tree tree = (Tree) p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getFunctionNumber()).isEqualTo(8);
  }

  @Test
  public void statements() {
    String path = "src/test/resources/metrics/functions.js";
    Tree tree = (Tree) p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getStatementsNumber()).isEqualTo(10);

    path = "src/test/resources/metrics/statements.js";
    tree = (Tree) p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getStatementsNumber()).isEqualTo(16);
  }

  @Test
  public void accessors() {
    String path = "src/test/resources/metrics/accessors.js";
    Tree tree = (Tree) p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getAccessorsNumber()).isEqualTo(4);
  }

  @Test
  public void classes() {
    String path = "src/test/resources/metrics/classes.js";
    Tree tree = (Tree) p.parse(new File(path));
    assertThat(new CounterVisitor(tree).getClassNumber()).isEqualTo(3);
  }

}
