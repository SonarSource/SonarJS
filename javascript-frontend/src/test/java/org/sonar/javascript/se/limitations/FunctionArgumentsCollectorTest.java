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
package org.sonar.javascript.se.limitations;

import java.util.Set;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.javascript.utils.TestUtils;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.se.limitations.CrossProceduralLimitation.FunctionArgumentsCollector;

public class FunctionArgumentsCollectorTest extends JavaScriptTreeModelTest {

  private Tree topTree;

  @Before
  public void setUp() throws Exception {
    final JavaScriptVisitorContext context = context(TestUtils.createTestInputFile("src/test/resources/se/limitations/function_argument_collector.js"));
    topTree = context.getTopTree();
  }

  @Test
  public void should_collect_all_arguments_from_function() throws Exception {
    final Set<Symbol> symbols = FunctionArgumentsCollector.collect(topTree);
    assertThat(symbols.stream().map(Symbol::name).toArray()).containsExactlyInAnyOrder("a", "b", "c");
  }
}
