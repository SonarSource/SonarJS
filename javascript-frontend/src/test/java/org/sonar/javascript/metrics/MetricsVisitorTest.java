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
import java.util.HashMap;
import java.util.Set;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class MetricsVisitorTest extends JavaScriptTreeModelTest {

  @Test
  public void test() {
    File moduleBaseDir = new File("src/test/resources/metrics/");
    SensorContextTester context = SensorContextTester.create(moduleBaseDir);

    DefaultInputFile inputFile = new DefaultInputFile("moduleKey", "lines.js")
      .setModuleBaseDir(moduleBaseDir.toPath())
      .setLanguage("js")
      .setType(InputFile.Type.MAIN);

    context.fileSystem().add(inputFile);

    FileLinesContextFactory linesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext linesContext = mock(FileLinesContext.class);
    when(linesContextFactory.createFor(inputFile)).thenReturn(linesContext);

    HashMap<InputFile, Set<Integer>> projectLinesOfCode = new HashMap<>();

    MetricsVisitor metricsVisitor = new MetricsVisitor(
      context.fileSystem(),
      context,
      mock(NoSonarFilter.class),
      false,
      linesContextFactory,
      projectLinesOfCode);

    TreeVisitorContext treeVisitorContext = mock(TreeVisitorContext.class);
    when(treeVisitorContext.getFile()).thenReturn(inputFile.file());
    when(treeVisitorContext.getTopTree()).thenReturn((ScriptTree) p.parse(inputFile.file()));

    metricsVisitor.scanTree(treeVisitorContext);

    String componentKey = "moduleKey:lines.js";
    assertThat(context.measure(componentKey, CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(componentKey, CoreMetrics.STATEMENTS).value()).isEqualTo(1);
    assertThat(context.measure(componentKey, CoreMetrics.CLASSES).value()).isEqualTo(0);

    assertThat(projectLinesOfCode).hasSize(1);
    Set<Integer> linesOfCode = projectLinesOfCode.get(inputFile);
    assertThat(linesOfCode).containsOnly(2, 3, 4);
  }
}
