/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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

import static org.mockito.Matchers.any;
import static org.mockito.Mockito.anyInt;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.net.URISyntaxException;

import org.junit.Test;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.resources.Resource;
import org.sonar.api.scan.filesystem.PathResolver;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.javascript.TestUtils;

public class FileLinesVisitorTest {

  @Test
  public void test() throws Exception {
    FileLinesContextFactory fileLinesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(Resource.class))).thenReturn(fileLinesContext);

    File file = TestUtils.getResource("/metrics/lines.js");
    FileLinesVisitor visitor = new FileLinesVisitor(fileLinesContextFactory, newFileSystem(file), new PathResolver());
    JavaScriptAstScanner.scanSingleFile(file, visitor);

    verify(fileLinesContext, times(3)).setIntValue(eq(CoreMetrics.NCLOC_DATA_KEY), anyInt(), eq(1));
    verify(fileLinesContext, times(1)).setIntValue(eq(CoreMetrics.COMMENT_LINES_DATA_KEY), anyInt(), eq(1));
  }

  private FileSystem newFileSystem(File file) throws URISyntaxException {
    DefaultFileSystem fs = new DefaultFileSystem();

    fs.setBaseDir(TestUtils.getResource("/metrics"));
    fs.add(new DefaultInputFile(file.getName())
      .setAbsolutePath(file.getAbsolutePath())
      .setType(InputFile.Type.MAIN));

    return fs;
  }

}
