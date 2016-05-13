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
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.resources.Resource;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class MetricsVisitorTest extends JavaScriptTreeModelTest {

  @Test
  public void test() {
    DefaultFileSystem fileSystem = new DefaultFileSystem(new File(""));

    File file = new File("src/test/resources/metrics/lines.js");

    DefaultInputFile inputFile = new DefaultInputFile("", "src/test/resources/metrics/lines.js")
//      .setAbsolutePath(file.getAbsolutePath())
      .setLanguage("js")
      .setType(InputFile.Type.MAIN);

    fileSystem.add(inputFile);

    SensorContext context = mock(SensorContext.class);

    Resource resource = mock(Resource.class);

    when(resource.getEffectiveKey()).thenReturn("someKey");
    when(context.getResource(inputFile)).thenReturn(resource);

    FileLinesContextFactory linesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext linesContext = mock(FileLinesContext.class);
    when(linesContextFactory.createFor(inputFile)).thenReturn(linesContext);

    MetricsVisitor metricsVisitor = new MetricsVisitor(
      fileSystem,
      context,
      mock(NoSonarFilter.class),
      false,
      linesContextFactory
    );

    TreeVisitorContext treeVisitorContext = mock(TreeVisitorContext.class);
    when(treeVisitorContext.getFile()).thenReturn(file);
    when(treeVisitorContext.getTopTree()).thenReturn((ScriptTree) p.parse(file));

    metricsVisitor.scanTree(treeVisitorContext);

    verify(context).saveMeasure(inputFile, CoreMetrics.FUNCTIONS, 1.0);
    verify(context).saveMeasure(inputFile, CoreMetrics.STATEMENTS, 1.0);
    verify(context).saveMeasure(inputFile, CoreMetrics.ACCESSORS, 0.0);
    verify(context).saveMeasure(inputFile, CoreMetrics.CLASSES, 0.0);

  }
}
