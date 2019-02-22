/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.javascript.visitors.JavaScriptFileImpl;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class MetricsVisitorTest extends JavaScriptTreeModelTest {

  private static final File MODULE_BASE_DIR = new File("src/test/resources/metrics/");

  private static final DefaultInputFile INPUT_FILE = new TestInputFileBuilder("moduleKey", "lines.js")
    .setModuleBaseDir(MODULE_BASE_DIR.toPath())
    .setLanguage("js")
    .setType(InputFile.Type.MAIN)
    .build();

  private static final String COMPONENT_KEY = "moduleKey:lines.js";
  private FileLinesContext linesContext;
  private SensorContextTester context;
  private TreeVisitorContext treeVisitorContext;

  @Before
  public void setUp() throws Exception {
    context = SensorContextTester.create(MODULE_BASE_DIR);
    context.fileSystem().add(INPUT_FILE);
    linesContext = mock(FileLinesContext.class);
    treeVisitorContext = mock(TreeVisitorContext.class);
    when(treeVisitorContext.getJavaScriptFile()).thenReturn(new JavaScriptFileImpl(INPUT_FILE));
    when(treeVisitorContext.getTopTree()).thenReturn(parse(INPUT_FILE.file()));
  }

  @Test
  public void test() {
    MetricsVisitor metricsVisitor = createMetricsVisitor();
    metricsVisitor.scanTree(treeVisitorContext);
    assertThat(context.measure(COMPONENT_KEY, CoreMetrics.FUNCTIONS).value()).isEqualTo(1);
    assertThat(context.measure(COMPONENT_KEY, CoreMetrics.STATEMENTS).value()).isEqualTo(1);
    assertThat(context.measure(COMPONENT_KEY, CoreMetrics.CLASSES).value()).isEqualTo(0);

    assertThat(metricsVisitor.executableLines().get(INPUT_FILE)).containsOnly(3);

    Mockito.verify(linesContext, atLeastOnce()).setIntValue(eq(CoreMetrics.EXECUTABLE_LINES_DATA_KEY), any(Integer.class), any(Integer.class));
  }

  private MetricsVisitor createMetricsVisitor() {
    FileLinesContextFactory linesContextFactory = mock(FileLinesContextFactory.class);
    when(linesContextFactory.createFor(INPUT_FILE)).thenReturn(linesContext);
    return new MetricsVisitor(context, false, linesContextFactory);
  }

}
