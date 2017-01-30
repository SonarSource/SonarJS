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

import java.io.File;
import org.junit.Test;
import org.mockito.Mockito;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.javascript.compat.InputFileWrapper;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

public class MetricsVisitorTest extends JavaScriptTreeModelTest {

  private static final File MODULE_BASE_DIR = new File("src/test/resources/metrics/");

  private static final DefaultInputFile INPUT_FILE = new DefaultInputFile("moduleKey", "lines.js")
    .setModuleBaseDir(MODULE_BASE_DIR.toPath())
    .setLanguage("js")
    .setType(InputFile.Type.MAIN);

  private static final String COMPONENT_KEY = "moduleKey:lines.js";

  @Test
  public void test() {
    SensorContextTester context = SensorContextTester.create(MODULE_BASE_DIR);

    MetricsVisitor metricsVisitor = saveMetrics(context, false);

    assertThat(context.measure(COMPONENT_KEY, CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(COMPONENT_KEY, CoreMetrics.STATEMENTS).value()).isEqualTo(1);
    assertThat(context.measure(COMPONENT_KEY, CoreMetrics.CLASSES).value()).isEqualTo(0);

    assertThat(metricsVisitor.linesOfCode().get(INPUT_FILE)).containsOnly(2, 3, 4);
  }

  @Test
  public void save_executable_lines() {
    saveMetrics(SensorContextTester.create(MODULE_BASE_DIR), true);
  }

  private MetricsVisitor saveMetrics(SensorContextTester context, boolean saveExecutableLines) {
    context.fileSystem().add(INPUT_FILE);

    FileLinesContextFactory linesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext linesContext = mock(FileLinesContext.class);
    when(linesContextFactory.createFor(INPUT_FILE)).thenReturn(linesContext);

    MetricsVisitor metricsVisitor = new MetricsVisitor(
      context,
      mock(NoSonarFilter.class),
      false,
      linesContextFactory,
      saveExecutableLines);

    TreeVisitorContext treeVisitorContext = mock(TreeVisitorContext.class);
    when(treeVisitorContext.getFile()).thenReturn(new InputFileWrapper(INPUT_FILE));
    when(treeVisitorContext.getTopTree()).thenReturn((ScriptTree) p.parse(INPUT_FILE.file()));

    metricsVisitor.scanTree(treeVisitorContext);
    Mockito.verify(linesContext, saveExecutableLines ? atLeastOnce() : times(0)).setIntValue(eq(CoreMetrics.EXECUTABLE_LINES_DATA_KEY), any(Integer.class), any(Integer.class));

    return metricsVisitor;
  }
}
