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
package org.sonar.javascript;

import com.google.common.base.Charsets;
import com.google.common.collect.ImmutableList;
import org.sonar.squidbridge.AstScanner;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.squidbridge.api.SourceProject;
import org.sonar.squidbridge.indexer.QueryByType;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;

public class JavaScriptAstScannerTest {

  @Test
  public void files() {
    AstScanner<LexerlessGrammar> scanner = JavaScriptAstScanner.create(new EcmaScriptConfiguration(Charsets.UTF_8));
    scanner.scanFiles(ImmutableList.of(new File("src/test/resources/metrics/lines.js"), new File("src/test/resources/metrics/lines_of_code.js")));
    SourceProject project = (SourceProject) scanner.getIndex().search(new QueryByType(SourceProject.class)).iterator().next();
    assertThat(project.getInt(EcmaScriptMetric.FILES)).isEqualTo(2);
  }

  @Test
  public void comments() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/comments.js"));
    assertThat(file.getInt(EcmaScriptMetric.COMMENT_LINES)).isEqualTo(3);
    assertThat(file.getNoSonarTagLines()).contains(10);
    assertThat(file.getNoSonarTagLines().size()).isEqualTo(1);
  }

  @Test
  public void lines() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/lines.js"));
    assertThat(file.getInt(EcmaScriptMetric.LINES)).isEqualTo(5);
  }

  @Test
  public void lines_of_code() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/lines_of_code.js"));
    assertThat(file.getInt(EcmaScriptMetric.LINES_OF_CODE)).isEqualTo(3);
  }

  @Test
  public void statements() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/statements.js"));
    assertThat(file.getInt(EcmaScriptMetric.STATEMENTS)).isEqualTo(16);
  }

  @Test
  public void functions() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/functions.js"));
    assertThat(file.getInt(EcmaScriptMetric.FUNCTIONS)).isEqualTo(8);
    assertThat(file.getInt(EcmaScriptMetric.STATEMENTS)).isEqualTo(10);
  }

  @Test
  public void accessors() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/accessors.js"));
    assertThat(file.getInt(EcmaScriptMetric.ACCESSORS)).isEqualTo(4);
  }

  @Test
  public void complexity() {
    SourceFile file = JavaScriptAstScanner.scanSingleFile(new File("src/test/resources/metrics/complexity.js"));
    assertThat(file.getInt(EcmaScriptMetric.COMPLEXITY)).isEqualTo(19);
  }

}
