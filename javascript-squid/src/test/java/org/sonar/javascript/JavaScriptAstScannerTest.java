/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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
package org.sonar.javascript;

import com.google.common.collect.ImmutableList;
import com.sonar.sslr.squid.AstScanner;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptGrammar;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.squid.api.SourceFile;
import org.sonar.squid.api.SourceProject;
import org.sonar.squid.indexer.QueryByType;

import java.io.File;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

public class JavaScriptAstScannerTest {

  @Test
  public void files() {
    AstScanner<EcmaScriptGrammar> scanner = JavaScriptAstScanner.create(new EcmaScriptConfiguration());
    scanner.scanFiles(ImmutableList.of(new File("src/test/resources/metrics/lines.js"), new File("src/test/resources/metrics/lines_of_code.js")));
    SourceProject project = (SourceProject) scanner.getIndex().search(new QueryByType(SourceProject.class)).iterator().next();
    assertThat(project.getInt(EcmaScriptMetric.FILES), is(2));
  }

  @Test
  public void comments() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/comments.js"));
    assertThat(file.getInt(EcmaScriptMetric.COMMENT_BLANK_LINES), is(4));
    assertThat(file.getInt(EcmaScriptMetric.COMMENT_LINES), is(3));
    assertThat(file.getNoSonarTagLines(), hasItem(10));
    assertThat(file.getNoSonarTagLines().size(), is(1));
  }

  @Test
  public void lines() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/lines.js"));
    assertThat(file.getInt(EcmaScriptMetric.LINES), is(5));
  }

  @Test
  public void lines_of_code() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/lines_of_code.js"));
    assertThat(file.getInt(EcmaScriptMetric.LINES_OF_CODE), is(3));
  }

  @Test
  public void statements() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/statements.js"));
    assertThat(file.getInt(EcmaScriptMetric.STATEMENTS), is(1));
  }

}
